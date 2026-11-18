"""Authentication: password hashing, server-side sessions and cookie handling."""

from __future__ import annotations

import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote, unquote

import psycopg
from fastapi import Request, Response

SESSION_COOKIE = "cc_session"
ORDERS_COOKIE = "cc_orders"
POSTCODE_COOKIE = "cc_postcode"
SESSION_DAYS = 30
DAY = 86400
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no easily confused characters


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=64)
    return f"{salt}:{digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt, _, hexed = stored.partition(":")
    if not salt or not hexed:
        return False
    try:
        expected = bytes.fromhex(hexed)
    except ValueError:
        return False
    actual = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=len(expected))
    return hmac.compare_digest(expected, actual)


def cookie_options(request: Request, max_age: int, http_only: bool = True) -> dict[str, Any]:
    """SameSite=Lax over plain http (local development). Over https the cookies are
    SameSite=None; Secure so the storefront also works when embedded in a preview frame.
    State-changing endpoints only accept JSON bodies, which browsers cannot send cross-site
    without a CORS preflight that this API never approves."""
    https = (request.headers.get("x-forwarded-proto") or "").split(",")[0].strip() == "https"
    return {"max_age": max_age, "path": "/", "httponly": http_only, "samesite": "none" if https else "lax", "secure": https}


def _token_id(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(conn: psycopg.Connection, request: Request, response: Response, user_id: int) -> None:
    token = secrets.token_hex(32)
    expires = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    # Only a hash of the token is stored, so a database leak can't be replayed as a session.
    conn.execute("insert into sessions (id, user_id, expires_at) values (%s, %s, %s)", (_token_id(token), user_id, expires))
    response.set_cookie(SESSION_COOKIE, token, **cookie_options(request, SESSION_DAYS * DAY))


def destroy_session(conn: psycopg.Connection, request: Request, response: Response) -> None:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        conn.execute("delete from sessions where id = %s", (_token_id(token),))
    response.set_cookie(SESSION_COOKIE, "", **cookie_options(request, 0))


def user_dto(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "phone": row["phone"],
        "referralCode": row["referral_code"],
        "marketingEmail": row["marketing_email"],
        "marketingSms": row["marketing_sms"],
    }


def current_user(conn: psycopg.Connection, request: Request) -> dict[str, Any] | None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    row = conn.execute(
        "select u.* from sessions s join users u on u.id = s.user_id where s.id = %s and s.expires_at > now()",
        (_token_id(token),),
    ).fetchone()
    return user_dto(row) if row else None


def random_code(length: int) -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(length))


def generate_referral_code(name: str) -> str:
    stem = re.sub(r"[^A-Z]", "", name.upper())[:5] or "CURRY"
    return f"{stem}-{random_code(5)}"


# Order references created in this browser, so guests can view their own confirmation page.
def remembered_orders(request: Request) -> list[str]:
    return [r for r in (request.cookies.get(ORDERS_COOKIE) or "").split(".") if r]


def remember_order(request: Request, response: Response, reference: str) -> None:
    refs = [reference] + [r for r in remembered_orders(request) if r != reference]
    response.set_cookie(ORDERS_COOKIE, ".".join(refs[:10]), **cookie_options(request, 30 * DAY))


def read_postcode_cookie(request: Request) -> str | None:
    raw = request.cookies.get(POSTCODE_COOKIE)
    return unquote(raw) if raw else None


def set_postcode_cookie(request: Request, response: Response, postcode: str | None) -> None:
    """Remembers the validated postcode for the rest of the shopping session."""
    if postcode:
        response.set_cookie(POSTCODE_COOKIE, quote(postcode), **cookie_options(request, 30 * DAY))
    else:
        response.set_cookie(POSTCODE_COOKIE, "", **cookie_options(request, 0))
