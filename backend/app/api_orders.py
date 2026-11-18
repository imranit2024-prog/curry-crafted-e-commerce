"""Checkout, payment, Stripe webhook, order lookup and reorder."""

from __future__ import annotations

import json
import logging
import os
import re
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from . import db
from .catalog import get_bundles, get_products
from .config import stripe_configured
from .db import Conn
from .orders import (
    create_order,
    finalize_order,
    get_order,
    order_dto,
    record_failed_payment,
    sync_stripe_payment,
    verify_stripe_signature,
)
from .postcode import check_postcode
from .schemas import CheckoutBody, DemoPaymentBody, LooseBody
from .security import current_user, read_postcode_cookie, remember_order, remembered_orders, set_postcode_cookie
from .util import dto, fail, text

log = logging.getLogger("curry_crafted")
router = APIRouter(prefix="/api", tags=["orders"])


def request_origin(request: Request) -> str:
    """Public origin of the storefront, used to build Stripe return URLs."""
    configured = os.environ.get("SITE_URL") or os.environ.get("NEXT_PUBLIC_SITE_URL")
    if configured:
        return configured.rstrip("/")
    h = request.headers
    host = (h.get("x-forwarded-host") or h.get("host") or "localhost:3000").split(",")[0].strip()
    local = host.startswith("localhost") or host.startswith("127.")
    proto = (h.get("x-forwarded-proto") or ("http" if local else "https")).split(",")[0].strip()
    return f"{proto}://{host}"


def _may_view(conn, request: Request, order: dict) -> bool:
    user = current_user(conn, request)
    return bool(user and order["user_id"] == user["id"]) or order["reference"] in remembered_orders(request)


@router.post("/checkout")
def checkout(body: CheckoutBody, request: Request, conn: Conn):
    try:
        user = current_user(conn, request)
        result = create_order(conn, body.data(), user, request_origin(request))
    except Exception:
        log.exception("checkout failed")
        return fail("We couldn't place your order just now. You haven't been charged and your basket is safe. Please try again.", 500)
    if not result["ok"]:
        return fail(result["error"], result["status"], fields=result.get("fields"), quote=result.get("quote"))
    postcode = result.pop("postcode", None)
    response = JSONResponse(result)
    remember_order(request, response, result["reference"])
    set_postcode_cookie(request, response, postcode)
    return response


@router.post("/checkout/pay")
def demo_payment(body: DemoPaymentBody, request: Request, conn: Conn):
    """DEMO PAYMENT ENDPOINT. Active only while STRIPE_SECRET_KEY is not configured.

    It never takes money and never stores card details: it lets the success and
    decline journeys be reviewed using Stripe's published test card numbers.
    """
    if stripe_configured():
        return fail("Demo payments are disabled because Stripe is connected.", 403)
    try:
        found = get_order(conn, text(body.reference, 20))
        if not found or not _may_view(conn, request, found["order"]):
            return fail("We couldn't find that order.", 404)
        order = found["order"]
        if order["payment_status"] == "paid":
            return {"status": "paid", "reference": order["reference"]}  # repeat submission: no second payment

        card = re.sub(r"\D", "", text(body.cardNumber, 30))
        expiry = re.match(r"^(\d{2})\s*/\s*(\d{2})$", text(body.expiry, 8))
        cvc = text(body.cvc, 4)
        fields: dict[str, str] = {}
        if len(card) != 16:
            fields["cardNumber"] = "Enter the 16-digit card number."
        if not expiry or not 1 <= int(expiry.group(1)) <= 12:
            fields["expiry"] = "Use the format MM/YY."
        else:
            month, year = int(expiry.group(1)), 2000 + int(expiry.group(2))
            end = datetime(year + (month == 12), month % 12 + 1, 1, tzinfo=timezone.utc)  # first day after the expiry month
            if end <= datetime.now(timezone.utc):
                fields["expiry"] = "This card has expired."
        if not re.match(r"^\d{3,4}$", cvc):
            fields["cvc"] = "Enter the 3-digit security code."
        if fields:
            return fail("Please check your card details.", 422, fields=fields)

        time.sleep(0.7)
        if card == "4242424242424242":
            finalize_order(conn, order["id"])
            return {"status": "paid", "reference": order["reference"]}
        record_failed_payment(conn, order["id"])
        if card == "4000000000000002":
            return fail("Your card was declined. You haven't been charged and your basket has been kept. Try another card.", 402, code="card_declined")
        return fail(
            "This preview only accepts Stripe test cards: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined.",
            402,
            code="test_card_required",
        )
    except Exception:
        log.exception("demo payment failed")
        return fail("The payment couldn't be processed. You haven't been charged. Please try again.", 500)


def _process_webhook(payload: str) -> None:
    event = json.loads(payload)
    session = (event.get("data") or {}).get("object") or {}
    if event.get("type") in ("checkout.session.completed", "checkout.session.async_payment_succeeded") and session.get("payment_status") == "paid":
        with db.connection() as conn:
            found = get_order(conn, str(session.get("client_reference_id") or ""))
            if found and found["order"]["stripe_session_id"] == session.get("id"):
                finalize_order(conn, found["order"]["id"])


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Marks orders paid even if the customer never returns to the confirmation page. Unsigned events are rejected."""
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    if not secret:
        return fail("Webhook secret not configured.", 503)
    payload = (await request.body()).decode("utf-8", errors="replace")
    if not verify_stripe_signature(payload, request.headers.get("stripe-signature"), secret):
        return fail("Invalid signature.", 400)
    try:
        await run_in_threadpool(_process_webhook, payload)
    except Exception:
        log.exception("webhook failed")
        return fail("Webhook processing failed.", 500)
    return {"received": True}


@router.get("/orders/{reference}")
def order_detail(reference: str, request: Request, conn: Conn, sync: int = 0):
    """Order details for the customer who placed it (account owner, or the browser that created a guest order)."""
    found = get_order(conn, reference)
    if not found:
        return fail("We couldn't find that order.", 404)
    if not _may_view(conn, request, found["order"]):
        return fail("Sign in to view this order.", 403, reference=found["order"]["reference"])
    order = sync_stripe_payment(conn, found["order"]) if sync else found["order"]
    return {"order": order_dto(order), "items": [dto(i) for i in found["items"]]}


@router.post("/orders/{reference}/reorder")
def reorder(reference: str, body: LooseBody, request: Request, conn: Conn):
    """Revalidates a previous order against today's catalogue, prices and delivery rules before anything is added to the basket."""
    try:
        user = current_user(conn, request)
        if not user:
            return fail("Please sign in.", 401)
        found = get_order(conn, reference)
        if not found or found["order"]["user_id"] != user["id"]:
            return fail("We couldn't find that order.", 404)

        products = get_products(conn)
        bundles = get_bundles(conn, products)
        product_by_id = {p["id"]: p for p in products}
        saved = read_postcode_cookie(request)
        postcode = None
        if saved:
            checked = check_postcode(conn, saved)
            postcode = checked["result"] if checked["valid"] else None

        items = []
        for item in found["items"]:
            line = None
            now_pence = None
            reason = None
            if item["kind"] == "product":
                p = product_by_id.get(item["ref_id"])
                if not p or not p["available"]:
                    reason = "No longer available"
                else:
                    variant = next((v for v in p["variants"] if v["id"] == item["variant_id"]), None) or p["variants"][0]
                    now_pence = variant["pricePence"]
                    line = {
                        "key": f"p:{p['id']}:{variant['id']}",
                        "type": "product",
                        "productId": p["id"],
                        "variantId": variant["id"],
                        "qty": min(item["quantity"], p["maxPerOrder"]),
                    }
            else:
                b = next((x for x in bundles if x["id"] == item["ref_id"]), None)
                contents = item["contents"] or []
                all_there = all((product_by_id.get(c["productId"]) or {}).get("available") for c in contents)
                if not b:
                    reason = "This bundle is no longer offered"
                elif not all_there:
                    reason = "A dish in this bundle is no longer available"
                else:
                    now_pence = b["pricePence"]
                    line = {
                        "key": f"b:{b['id']}:{int(time.time() * 1000):x}{item['id']}",
                        "type": "bundle",
                        "bundleId": b["id"],
                        "selections": [{"productId": c["productId"], "qty": c["qty"]} for c in contents],
                        "qty": min(item["quantity"], 6),
                    }
            status = "available" if line else "unavailable"
            if line and item["range"] == "chilled":
                if not postcode:
                    status, reason = "chilled-unchecked", "Check your postcode to confirm chilled delivery"
                elif not postcode["chilled"]:
                    status, reason = "not-deliverable", f"Chilled delivery isn't available for {postcode['postcode']}"
            elif line and postcode and not postcode["frozen"]:
                status, reason = "not-deliverable", f"Frozen delivery isn't available for {postcode['postcode']}"
            items.append(
                {
                    "name": item["name"],
                    "range": item["range"],
                    "qty": item["quantity"],
                    "wasPence": item["unit_price_pence"],
                    "nowPence": now_pence,
                    "status": status,
                    "reason": reason,
                    "line": line if status == "available" else None,
                }
            )
        return {"reference": found["order"]["reference"], "postcode": postcode, "items": items}
    except Exception:
        log.exception("reorder failed")
        return fail("We couldn't check that order just now. Please try again.", 500)
