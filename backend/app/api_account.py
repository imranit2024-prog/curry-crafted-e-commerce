"""Signed-in customer endpoints: addresses, details, password, marketing preferences, orders, rewards."""

from __future__ import annotations

from typing import Any

import psycopg
from fastapi import APIRouter, HTTPException, Request

from .db import Conn
from .orders import get_orders_for_user, get_reward_summary
from .postcode import parse_postcode
from .schemas import AddressBody, DetailsBody, PasswordBody, PreferencesBody
from .security import current_user, hash_password, user_dto, verify_password
from .util import EMAIL_RE, PHONE_RE, fail, text, whole

router = APIRouter(prefix="/api/account", tags=["account"])


def require_user(conn: psycopg.Connection, request: Request) -> dict[str, Any]:
    user = current_user(conn, request)
    if not user:
        raise HTTPException(status_code=401, detail="Please sign in.")
    return user


def list_addresses(conn: psycopg.Connection, user_id: int) -> list[dict[str, Any]]:
    rows = conn.execute(
        "select id, label, line1, line2, city, postcode, is_default from addresses where user_id = %s order by id", (user_id,)
    ).fetchall()
    return [
        {"id": a["id"], "label": a["label"], "line1": a["line1"], "line2": a["line2"], "city": a["city"], "postcode": a["postcode"], "isDefault": a["is_default"]}
        for a in rows
    ]


@router.get("/addresses")
def addresses(request: Request, conn: Conn):
    user = require_user(conn, request)
    return {"addresses": list_addresses(conn, user["id"])}


@router.post("/addresses")
def addresses_update(body: AddressBody, request: Request, conn: Conn):
    user = require_user(conn, request)
    uid = user["id"]
    action = text(body.action, 20) or "create"
    address_id = whole(body.id)

    # Every statement is scoped to the signed-in customer, so one account can never touch another's addresses.
    if action == "delete":
        conn.execute("delete from addresses where id = %s and user_id = %s", (address_id, uid))
        return {"addresses": list_addresses(conn, uid)}
    if action == "default":
        with conn.transaction():
            conn.execute("update addresses set is_default = false where user_id = %s", (uid,))
            conn.execute("update addresses set is_default = true where id = %s and user_id = %s", (address_id, uid))
        return {"addresses": list_addresses(conn, uid)}

    line1 = text(body.line1, 160)
    city = text(body.city, 80)
    pc = parse_postcode(text(body.postcode, 12))
    fields: dict[str, str] = {}
    if len(line1) < 3:
        fields["line1"] = "Enter the first line of the address."
    if len(city) < 2:
        fields["city"] = "Enter a town or city."
    if not pc:
        fields["postcode"] = "Enter a full UK postcode."
    if fields or not pc:
        return fail("Please check the highlighted fields.", 422, fields=fields)
    existing = list_addresses(conn, uid)
    if len(existing) >= 10:
        return fail("You can save up to 10 addresses.", 422)
    make_default = body.isDefault is True or not existing
    with conn.transaction():
        if make_default:
            conn.execute("update addresses set is_default = false where user_id = %s", (uid,))
        conn.execute(
            "insert into addresses (user_id, label, line1, line2, city, postcode, is_default) values (%s, %s, %s, %s, %s, %s, %s)",
            (uid, text(body.label, 40) or "Home", line1, text(body.line2, 160), city, pc["formatted"], make_default),
        )
    return {"addresses": list_addresses(conn, uid)}


@router.post("/details")
def details(body: DetailsBody, request: Request, conn: Conn):
    user = require_user(conn, request)
    name = text(body.name, 120)
    email = text(body.email, 200).lower()
    phone = text(body.phone, 30)
    fields: dict[str, str] = {}
    if len(name) < 2:
        fields["name"] = "Enter your full name."
    if not EMAIL_RE.match(email):
        fields["email"] = "Enter a valid email address."
    if not PHONE_RE.match(phone):
        fields["phone"] = "Enter a valid telephone number."
    if fields:
        return fail("Please check the highlighted fields.", 422, fields=fields)
    if conn.execute("select id from users where email = %s and id <> %s", (email, user["id"])).fetchone():
        return fail("Please check the highlighted fields.", 422, fields={"email": "That email is already used by another account."})
    updated = conn.execute("update users set name = %s, email = %s, phone = %s where id = %s returning *", (name, email, phone, user["id"])).fetchone()
    return {"user": user_dto(updated)}


@router.post("/password")
def password(body: PasswordBody, request: Request, conn: Conn):
    user = require_user(conn, request)
    current = body.currentPassword if isinstance(body.currentPassword, str) else ""
    new = body.newPassword if isinstance(body.newPassword, str) else ""
    row = conn.execute("select password_hash from users where id = %s", (user["id"],)).fetchone()
    fields: dict[str, str] = {}
    if not row or not verify_password(current, row["password_hash"]):
        fields["currentPassword"] = "Your current password isn't correct."
    if len(new) < 8 or len(new) > 200:
        fields["newPassword"] = "Use at least 8 characters."
    if fields:
        return fail("Please check the highlighted fields.", 422, fields=fields)
    conn.execute("update users set password_hash = %s where id = %s", (hash_password(new), user["id"]))
    return {"updated": True}


@router.post("/preferences")
def preferences(body: PreferencesBody, request: Request, conn: Conn):
    user = require_user(conn, request)
    # The time of each consent change is recorded alongside the choice.
    updated = conn.execute(
        "update users set marketing_email = %s, marketing_sms = %s, marketing_updated_at = now() where id = %s returning *",
        (body.marketingEmail is True, body.marketingSms is True, user["id"]),
    ).fetchone()
    return {"user": user_dto(updated)}


@router.get("/orders")
def orders(request: Request, conn: Conn):
    user = require_user(conn, request)
    return {"orders": get_orders_for_user(conn, user["id"])}


@router.get("/rewards")
def rewards(request: Request, conn: Conn):
    user = require_user(conn, request)
    return get_reward_summary(conn, user["id"])
