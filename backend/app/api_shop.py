"""Public storefront endpoints: session, catalogue, delivery eligibility, basket quote, search, schedule, forms."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from .catalog import get_bundles, get_products, search_products
from .config import get_config, stripe_configured
from .db import Conn
from .postcode import check_postcode
from .pricing import build_quote
from .schedule import get_schedule
from .schemas import FormBody, PostcodeBody, QuoteBody
from .security import current_user, read_postcode_cookie, set_postcode_cookie
from .util import EMAIL_RE, fail, text, whole

log = logging.getLogger("curry_crafted")
router = APIRouter(prefix="/api", tags=["storefront"])


@router.get("/health")
def health(conn: Conn):
    conn.execute("select 1")
    return {"ok": True, "service": "curry-crafted-api"}


@router.get("/session")
def session(request: Request, conn: Conn):
    """The signed-in customer (if any) and the delivery result for the postcode saved in this shopping session."""
    saved = read_postcode_cookie(request)
    postcode = None
    if saved:
        checked = check_postcode(conn, saved)
        postcode = checked["result"] if checked["valid"] else None
    return {"user": current_user(conn, request), "postcode": postcode}


@router.get("/config")
def config(conn: Conn):
    return {"config": get_config(conn), "stripeEnabled": stripe_configured()}


@router.get("/catalog/products")
def products(conn: Conn):
    return {"products": get_products(conn)}


@router.get("/catalog/bundles")
def bundles(conn: Conn):
    return {"bundles": get_bundles(conn)}


@router.get("/delivery/restrictions")
def restrictions(conn: Conn):
    rows = conn.execute("select id, prefix, kind, surcharge_pence, note from frozen_restrictions order by prefix").fetchall()
    return {
        "restrictions": [
            {"id": r["id"], "prefix": r["prefix"], "kind": r["kind"], "surchargePence": r["surcharge_pence"], "note": r["note"]} for r in rows
        ]
    }


@router.post("/postcode")
def postcode_check(body: PostcodeBody, request: Request, conn: Conn):
    try:
        checked = check_postcode(conn, text(body.postcode, 12))
    except Exception:
        log.exception("postcode check failed")
        return fail("We couldn't check that postcode just now. Please try again.", 500)
    if not checked["valid"]:
        return fail(checked["error"], 422)
    response = JSONResponse({"result": checked["result"]})
    set_postcode_cookie(request, response, checked["result"]["postcode"])
    return response


@router.delete("/postcode")
def postcode_clear(request: Request):
    response = JSONResponse({"cleared": True})
    set_postcode_cookie(request, response, None)
    return response


@router.post("/cart/quote")
def cart_quote(body: QuoteBody, request: Request, conn: Conn):
    try:
        user = current_user(conn, request)
        quote = build_quote(
            conn,
            lines=body.lines,
            postcode=text(body.postcode, 12) or None,
            promo_code=text(body.promoCode, 40) or None,
            redeem_points=whole(body.redeemPoints) or 0,
            user_id=user["id"] if user else None,
        )
        return {"quote": quote}
    except Exception:
        log.exception("quote failed")
        return fail("We couldn't update your basket just now. Please try again.", 500)


@router.get("/search")
def search(conn: Conn, q: str = ""):
    query = q.strip()[:60]
    all_products = get_products(conn)
    matches = search_products(all_products, query) if query else [p for p in all_products if p["featured"]]
    keys = ("slug", "name", "image", "range", "category", "pricePence", "available")
    return {"query": query, "total": len(matches), "results": [{k: p[k] for k in keys} for p in matches[:6]]}


@router.get("/schedule")
def schedule(conn: Conn):
    try:
        return {"schedule": get_schedule(conn, get_config(conn))}
    except Exception:
        log.exception("schedule failed")
        return fail("We couldn't load delivery dates just now.", 500)


@router.post("/forms/{kind}")
def forms(kind: str, body: FormBody, conn: Conn):
    email = text(body.email, 200).lower()
    fields: dict[str, str] = {}
    if kind == "newsletter":
        if not EMAIL_RE.match(email):
            fields["email"] = "Enter a valid email address."
        if body.consent is not True:
            fields["consent"] = "Please confirm you'd like to receive our emails."
        if fields:
            return fail(next(iter(fields.values())), 422, fields=fields)
        conn.execute("insert into newsletter_subscribers (email, consent) values (%s, true) on conflict (email) do nothing", (email,))
        return {"subscribed": True}
    if kind == "contact":
        name = text(body.name, 120)
        message = text(body.message, 4000)
        if len(name) < 2:
            fields["name"] = "Enter your name."
        if not EMAIL_RE.match(email):
            fields["email"] = "Enter a valid email address."
        if len(message) < 10:
            fields["message"] = "Tell us a little more so we can help (at least 10 characters)."
        if fields:
            return fail("Please check the highlighted fields.", 422, fields=fields)
        conn.execute(
            "insert into contact_messages (name, email, topic, message) values (%s, %s, %s, %s)",
            (name, email, text(body.topic, 60) or "General", message),
        )
        return {"sent": True}
    return fail("Not found.", 404)
