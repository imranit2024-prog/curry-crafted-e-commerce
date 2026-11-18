"""Registration, sign-in and sign-out."""

from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from .db import Conn
from .schemas import LoginBody, LooseBody, RegisterBody
from .security import create_session, current_user, destroy_session, generate_referral_code, hash_password, user_dto, verify_password
from .util import EMAIL_RE, PHONE_RE, fail, text

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me")
def me(request: Request, conn: Conn):
    return {"user": current_user(conn, request)}


@router.post("/logout")
def logout(body: LooseBody, request: Request, conn: Conn):
    response = JSONResponse({"user": None})
    destroy_session(conn, request, response)
    return response


@router.post("/login")
def login(body: LoginBody, request: Request, conn: Conn):
    email = text(body.email, 200).lower()
    password = body.password if isinstance(body.password, str) else ""
    fields: dict[str, str] = {}
    if not EMAIL_RE.match(email):
        fields["email"] = "Enter your email address."
    if not password:
        fields["password"] = "Enter your password."
    if fields:
        return fail("Please check the highlighted fields.", 422, fields=fields)
    user = conn.execute("select * from users where email = %s", (email,)).fetchone()
    # One generic message, so the response never reveals whether an email is registered.
    if not user or not verify_password(password, user["password_hash"]):
        return fail("That email and password don't match our records.", 401)
    response = JSONResponse({"user": user_dto(user)})
    create_session(conn, request, response, user["id"])
    return response


@router.post("/register")
def register(body: RegisterBody, request: Request, conn: Conn):
    name = text(body.name, 120)
    email = text(body.email, 200).lower()
    phone = text(body.phone, 30)
    password = body.password if isinstance(body.password, str) else ""
    confirm = body.confirmPassword if isinstance(body.confirmPassword, str) else ""
    referral_code = text(body.referralCode, 20).upper()

    fields: dict[str, str] = {}
    if len(name) < 2:
        fields["name"] = "Enter your full name."
    if not EMAIL_RE.match(email):
        fields["email"] = "Enter a valid email address."
    if not PHONE_RE.match(phone):
        fields["phone"] = "Enter a valid telephone number."
    if len(password) < 8:
        fields["password"] = "Use at least 8 characters."
    elif len(password) > 200:
        fields["password"] = "That password is too long."
    if confirm != password:
        fields["confirmPassword"] = "Passwords don't match."
    referrer = None
    if referral_code:
        referrer = conn.execute("select id from users where referral_code = %s", (referral_code,)).fetchone()
        if not referrer:
            fields["referralCode"] = "We don't recognise that referral code."
    if fields:
        return fail("Please check the highlighted fields.", 422, fields=fields)
    if conn.execute("select id from users where email = %s", (email,)).fetchone():
        return fail("Please check the highlighted fields.", 422, fields={"email": "An account already exists for this email. Try signing in."})

    marketing = body.marketingEmail is True
    with conn.transaction():
        user = conn.execute(
            """
            insert into users (name, email, phone, password_hash, referral_code, referred_by_user_id, marketing_email, marketing_updated_at)
            values (%s, %s, %s, %s, %s, %s, %s, case when %s then now() else null end)
            returning *
            """,
            (name, email, phone, hash_password(password), generate_referral_code(name), referrer["id"] if referrer else None, marketing, marketing),
        ).fetchone()
        if referrer:
            # The referral is only recorded here. Rewards are issued later, once a qualifying order is paid.
            conn.execute(
                "insert into referrals (referrer_user_id, referred_user_id) values (%s, %s) on conflict (referred_user_id) do nothing",
                (referrer["id"], user["id"]),
            )
    response = JSONResponse({"user": user_dto(user)})
    create_session(conn, request, response, user["id"])
    return response
