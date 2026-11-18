"""Orders and payments: creation, Stripe, idempotent completion, loyalty and referral awards."""

from __future__ import annotations

import calendar
import hashlib
import hmac
import json
import logging
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

import psycopg
from psycopg.types.json import Jsonb

from .config import get_config, stripe_configured
from .postcode import check_postcode
from .pricing import build_quote, get_reward_balance
from .schedule import SLOT_HOLD_SQL, get_chilled_dates, get_frozen_estimate, hold_cutoff
from .security import random_code
from .util import EMAIL_RE, PHONE_RE, dto, number, text, whole

log = logging.getLogger("curry_crafted")

ORDER_PRIVATE = ("idempotency_key", "stripe_session_id", "stripe_url")


def order_dto(row: dict[str, Any]) -> dict[str, Any]:
    return dto(row, omit=ORDER_PRIVATE)


# --------------------------------------------------------------------------- #
# Stripe (REST API, no SDK required)                                           #
# --------------------------------------------------------------------------- #


class StripeError(Exception):
    pass


def _stripe_request(path: str, params: dict[str, str] | None = None, idempotency_key: str | None = None) -> dict[str, Any]:
    data = urllib.parse.urlencode(params).encode() if params else None
    req = urllib.request.Request(f"https://api.stripe.com/v1{path}", data=data, method="POST" if params else "GET")
    req.add_header("Authorization", f"Bearer {os.environ.get('STRIPE_SECRET_KEY', '')}")
    if params:
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
    if idempotency_key:
        req.add_header("Idempotency-Key", idempotency_key)
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            return json.load(res)
    except urllib.error.HTTPError as err:
        try:
            message = json.load(err).get("error", {}).get("message", "Stripe request failed")
        except Exception:
            message = "Stripe request failed"
        raise StripeError(message) from err
    except urllib.error.URLError as err:
        raise StripeError("Could not reach Stripe") from err


def _create_stripe_session(order: dict[str, Any], origin: str) -> dict[str, str]:
    ref = order["reference"]
    params = {
        "mode": "payment",
        "success_url": f"{origin}/checkout/confirmation/{ref}?session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{origin}/checkout?payment=cancelled",
        "customer_email": order["email"],
        "client_reference_id": ref,
        "metadata[order_reference]": ref,
        "payment_intent_data[metadata][order_reference]": ref,
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "gbp",
        "line_items[0][price_data][unit_amount]": str(order["total_pence"]),
        "line_items[0][price_data][product_data][name]": f"Curry Crafted order {ref}",
    }
    # The Stripe idempotency key is tied to the order, so a retried request can never create a second charge.
    session = _stripe_request("/checkout/sessions", params, f"cc-order-{ref}")
    return {"id": str(session["id"]), "url": str(session["url"])}


def sync_stripe_payment(conn: psycopg.Connection, order: dict[str, Any]) -> dict[str, Any]:
    """Called when the customer returns from Stripe: confirm with Stripe before marking the order paid."""
    if order["payment_status"] == "paid" or order["payment_mode"] != "stripe" or not order["stripe_session_id"] or not stripe_configured():
        return order
    try:
        session = _stripe_request(f"/checkout/sessions/{urllib.parse.quote(order['stripe_session_id'], safe='')}")
        if session.get("payment_status") == "paid" and session.get("client_reference_id") == order["reference"]:
            finalize_order(conn, order["id"])
            return conn.execute("select * from orders where id = %s", (order["id"],)).fetchone() or order
    except StripeError:
        log.exception("Stripe session lookup failed")
    return order


def verify_stripe_signature(payload: str, header: str | None, secret: str) -> bool:
    if not header:
        return False
    timestamp = ""
    signatures: list[str] = []
    for part in header.split(","):
        key, _, value = part.partition("=")
        if key == "t":
            timestamp = value
        elif key == "v1":
            signatures.append(value)
    if not timestamp.isdigit() or not signatures or abs(time.time() - int(timestamp)) > 300:
        return False
    expected = hmac.new(secret.encode(), f"{timestamp}.{payload}".encode(), hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, s) for s in signatures)


# --------------------------------------------------------------------------- #
# Order creation                                                               #
# --------------------------------------------------------------------------- #


class _SlotFull(Exception):
    pass


def _err(status: int, error: str, **extra: Any) -> dict[str, Any]:
    return {"ok": False, "status": status, "error": error, **extra}


def _payment_for(conn: psycopg.Connection, order: dict[str, Any], origin: str) -> dict[str, Any]:
    base = {
        "ok": True,
        "reference": order["reference"],
        "totalPence": order["total_pence"],
        "paid": order["payment_status"] == "paid",
        "postcode": order["address"]["postcode"],
    }
    if order["payment_mode"] != "stripe":
        return {**base, "payment": {"mode": "demo"}}
    if order["stripe_url"] and order["stripe_session_id"]:
        return {**base, "payment": {"mode": "stripe", "url": order["stripe_url"]}}
    try:
        session = _create_stripe_session(order, origin)
        conn.execute("update orders set stripe_session_id = %s, stripe_url = %s where id = %s", (session["id"], session["url"], order["id"]))
        return {**base, "payment": {"mode": "stripe", "url": session["url"]}}
    except StripeError:
        log.exception("Stripe session creation failed")
        return _err(502, "We couldn't start the secure payment. Your basket is safe — please try again.")


def create_order(conn: psycopg.Connection, body: dict[str, Any], user: dict[str, Any] | None, origin: str) -> dict[str, Any]:
    config = get_config(conn)
    if not user and not config["guestCheckout"]:
        return _err(401, "Please sign in to place an order.")

    customer = body.get("customer") if isinstance(body.get("customer"), dict) else {}
    addr = body.get("address") if isinstance(body.get("address"), dict) else {}
    name = text(customer.get("name"), 120)
    email = text(customer.get("email"), 200).lower()
    phone = text(customer.get("phone"), 30)
    line1 = text(addr.get("line1"), 160)
    line2 = text(addr.get("line2"), 160)
    city = text(addr.get("city"), 80)
    idempotency_key = text(body.get("idempotencyKey"), 80)

    fields: dict[str, str] = {}
    if len(name) < 2:
        fields["name"] = "Enter your full name."
    if not EMAIL_RE.match(email):
        fields["email"] = "Enter a valid email address."
    if not PHONE_RE.match(phone):
        fields["phone"] = "Enter a valid telephone number."
    if len(line1) < 3:
        fields["line1"] = "Enter the first line of your address."
    if len(city) < 2:
        fields["city"] = "Enter your town or city."
    pc = check_postcode(conn, text(addr.get("postcode"), 12))
    if not pc["valid"]:
        fields["postcode"] = pc["error"]
    if len(idempotency_key) < 12:
        return _err(400, "Something went wrong preparing your order. Please refresh and try again.")
    if fields:
        return _err(422, "Please check the highlighted details.", fields=fields)
    postcode = pc["result"]["postcode"]

    # Duplicate submission: return the order that already exists for this attempt.
    existing = conn.execute("select * from orders where idempotency_key = %s", (idempotency_key,)).fetchone()
    if existing:
        return _payment_for(conn, existing, origin)

    # Re-price everything from the database at the moment of ordering.
    quote = build_quote(
        conn,
        lines=body.get("lines"),
        postcode=postcode,
        promo_code=text(body.get("promoCode"), 40) or None,
        redeem_points=whole(body.get("redeemPoints")) or 0,
        user_id=user["id"] if user else None,
    )
    if not quote["canCheckout"]:
        return _err(409, quote["blockers"][0] if quote["blockers"] else "Your basket can't be checked out yet.", quote=quote)
    if number(body.get("expectedTotalPence")) != quote["totalPence"]:
        return _err(
            409,
            "Prices or delivery charges have changed since you last reviewed your order. Please review the updated total.",
            quote=quote,
        )

    chilled_date = slot_id = slot_label = None
    if quote["chilled"]:
        dates = get_chilled_dates(conn, config)
        day = next((d for d in dates if d["date"] == text(body.get("chilledDate"), 10)), None)
        slot = next((s for s in day["slots"] if s["id"] == text(body.get("chilledSlotId"), 20)), None) if day else None
        if not day or not slot:
            return _err(422, "Choose a delivery day and time slot for your chilled meals.")
        if not day["open"]:
            return _err(409, f"The order cut-off for {day['longLabel']} has passed. Please choose another day.")
        if not slot["available"]:
            return _err(409, f"The {slot['label']} slot on {day['longLabel']} is now fully booked. Please choose another slot.")
        chilled_date, slot_id, slot_label = day["date"], slot["id"], f"{day['longLabel']}, {slot['label']}"
    frozen = get_frozen_estimate(config) if quote["frozen"] else None

    try:
        with conn.transaction():
            if chilled_date and slot_id:
                # Serialise bookings for this slot so capacity can never be oversold.
                conn.execute("select pg_advisory_xact_lock(hashtext(%s))", (f"{chilled_date}:{slot_id}",))
                booked = conn.execute(
                    f"select count(*)::int as n from orders where chilled_date = %s and chilled_slot_id = %s and {SLOT_HOLD_SQL}",
                    (chilled_date, slot_id, hold_cutoff()),
                ).fetchone()["n"]
                if booked >= config["chilledSchedule"]["capacityPerSlot"]:
                    raise _SlotFull()
            order = conn.execute(
                """
                insert into orders (reference, idempotency_key, user_id, name, email, phone, address, payment_mode, subtotal_pence,
                                    promo_code, discount_pence, reward_points_redeemed, reward_discount_pence, chilled_delivery_pence,
                                    frozen_delivery_pence, total_pence, points_earned, chilled_date, chilled_slot_id, chilled_slot_label,
                                    frozen_dispatch_date, frozen_estimate)
                values (%(reference)s, %(key)s, %(user_id)s, %(name)s, %(email)s, %(phone)s, %(address)s, %(payment_mode)s, %(subtotal)s,
                        %(promo)s, %(discount)s, %(points_redeemed)s, %(reward_discount)s, %(chilled_delivery)s, %(frozen_delivery)s,
                        %(total)s, %(points_earned)s, %(chilled_date)s, %(slot_id)s, %(slot_label)s, %(dispatch)s, %(estimate)s)
                returning *
                """,
                {
                    "reference": f"CC-{random_code(8)}",
                    "key": idempotency_key,
                    "user_id": user["id"] if user else None,
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "address": Jsonb({"line1": line1, "line2": line2, "city": city, "postcode": postcode}),
                    "payment_mode": "stripe" if stripe_configured() else "demo",
                    "subtotal": quote["subtotalPence"],
                    "promo": quote["promo"]["code"] if quote["promo"] and quote["promo"]["valid"] else None,
                    "discount": quote["discountPence"],
                    "points_redeemed": quote["rewards"]["applied"],
                    "reward_discount": quote["rewardDiscountPence"],
                    "chilled_delivery": quote["chilled"]["deliveryPence"] if quote["chilled"] else 0,
                    "frozen_delivery": quote["frozen"]["deliveryPence"] if quote["frozen"] else 0,
                    "total": quote["totalPence"],
                    "points_earned": quote["pointsToEarn"] if user else 0,
                    "chilled_date": chilled_date,
                    "slot_id": slot_id,
                    "slot_label": slot_label,
                    "dispatch": frozen["dispatchDate"] if frozen else None,
                    "estimate": f"Dispatched {frozen['dispatchLabel']} · estimated delivery {frozen['estimateLabel']}" if frozen else None,
                },
            ).fetchone()
            for line in quote["lines"]:
                conn.execute(
                    """
                    insert into order_items (order_id, kind, ref_id, variant_id, name, image, range, variant_label, quantity,
                                             unit_price_pence, line_total_pence, contents)
                    values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        order["id"],
                        line["type"],
                        line["refId"],
                        line["variantId"],
                        line["name"],
                        line["image"],
                        line["range"],
                        line["variantLabel"],
                        line["qty"],
                        line["unitPricePence"],
                        line["lineTotalPence"],
                        Jsonb(line["contents"]) if line["contents"] is not None else None,
                    ),
                )
    except _SlotFull:
        return _err(409, "That delivery slot has just been fully booked. Please choose another slot.")
    except psycopg.errors.UniqueViolation:
        # A concurrent duplicate submission reached the unique idempotency key first.
        dupe = conn.execute("select * from orders where idempotency_key = %s", (idempotency_key,)).fetchone()
        if dupe:
            return _payment_for(conn, dupe, origin)
        raise

    if user and body.get("saveAddress") is True:
        mine = conn.execute("select line1, postcode from addresses where user_id = %s", (user["id"],)).fetchall()
        same = any(a["line1"].lower() == line1.lower() and a["postcode"] == postcode for a in mine)
        if not same and len(mine) < 10:
            conn.execute(
                "insert into addresses (user_id, label, line1, line2, city, postcode, is_default) values (%s, %s, %s, %s, %s, %s, %s)",
                (user["id"], "Address" if mine else "Home", line1, line2, city, postcode, len(mine) == 0),
            )

    return _payment_for(conn, order, origin)


# --------------------------------------------------------------------------- #
# Payment completion: idempotent; awards loyalty and referral rewards          #
# --------------------------------------------------------------------------- #


def _add_months(moment: datetime, months: int) -> datetime:
    index = moment.month - 1 + months
    year, month = moment.year + index // 12, index % 12 + 1
    return moment.replace(year=year, month=month, day=min(moment.day, calendar.monthrange(year, month)[1]))


def finalize_order(conn: psycopg.Connection, order_id: int) -> None:
    config = get_config(conn)
    with conn.transaction():
        order = conn.execute("select * from orders where id = %s for update", (order_id,)).fetchone()
        if not order or order["payment_status"] == "paid":
            return  # already processed: never award twice
        conn.execute("update orders set payment_status = 'paid', status = 'confirmed', paid_at = now() where id = %s", (order_id,))
        user_id = order["user_id"]
        if not user_id:
            return

        rewards, referral_rules = config["rewards"], config["referral"]
        expires = _add_months(datetime.now(timezone.utc), rewards["expiryMonths"])
        ref = order["reference"]

        if order["reward_points_redeemed"] > 0:
            balance = get_reward_balance(conn, user_id)
            conn.execute(
                "insert into reward_transactions (user_id, order_id, kind, points, description) values (%s, %s, 'redeem', %s, %s)",
                (user_id, order_id, -min(order["reward_points_redeemed"], balance), f"Redeemed on order {ref}"),
            )
        if order["points_earned"] > 0:
            suffix = " (double points)" if rewards["doublePoints"]["active"] else ""
            conn.execute(
                "insert into reward_transactions (user_id, order_id, kind, points, description, expires_at) values (%s, %s, 'earn', %s, %s, %s)",
                (user_id, order_id, order["points_earned"], f"Earned on order {ref}{suffix}", expires),
            )

        # Referral rewards are only released once the referred customer's order meets the qualifying spend.
        goods_paid = order["subtotal_pence"] - order["discount_pence"] - order["reward_discount_pence"]
        if goods_paid >= referral_rules["minQualifyingOrderPence"]:
            referral = conn.execute(
                "select * from referrals where referred_user_id = %s and status = 'registered' for update", (user_id,)
            ).fetchone()
            if referral:
                conn.execute(
                    "update referrals set status = 'qualified', qualified_at = now(), reward_points = %s where id = %s",
                    (referral_rules["referrerPoints"], referral["id"]),
                )
                insert = "insert into reward_transactions (user_id, order_id, kind, points, description, expires_at) values (%s, %s, 'referral', %s, %s, %s)"
                conn.execute(
                    insert,
                    (referral["referrer_user_id"], order_id, referral_rules["referrerPoints"], "Referral reward: your friend placed a qualifying order", expires),
                )
                conn.execute(insert, (user_id, order_id, referral_rules["friendPoints"], "Welcome reward for joining through a friend", expires))


def record_failed_payment(conn: psycopg.Connection, order_id: int) -> None:
    conn.execute("update orders set payment_status = 'failed' where id = %s and payment_status in ('unpaid', 'failed')", (order_id,))


# --------------------------------------------------------------------------- #
# Reads                                                                        #
# --------------------------------------------------------------------------- #


def get_order(conn: psycopg.Connection, reference: str) -> dict[str, Any] | None:
    order = conn.execute("select * from orders where reference = %s", (reference.upper(),)).fetchone()
    if not order:
        return None
    items = conn.execute("select * from order_items where order_id = %s order by id", (order["id"],)).fetchall()
    return {"order": order, "items": items}


def get_orders_for_user(conn: psycopg.Connection, user_id: int) -> list[dict[str, Any]]:
    orders = conn.execute(
        "select * from orders where user_id = %s and payment_status = 'paid' order by created_at desc", (user_id,)
    ).fetchall()
    if not orders:
        return []
    items = conn.execute("select * from order_items where order_id = any(%s) order by id", ([o["id"] for o in orders],)).fetchall()
    return [{"order": order_dto(o), "items": [dto(i) for i in items if i["order_id"] == o["id"]]} for o in orders]


def get_reward_summary(conn: psycopg.Connection, user_id: int) -> dict[str, Any]:
    history = conn.execute("select * from reward_transactions where user_id = %s order by created_at desc, id desc", (user_id,)).fetchall()
    referral_rows = conn.execute(
        """
        select r.*, u.name as friend_name
        from referrals r join users u on u.id = r.referred_user_id
        where r.referrer_user_id = %s
        order by r.created_at desc
        """,
        (user_id,),
    ).fetchall()
    expiring = sorted(h["expires_at"] for h in history if h["points"] > 0 and h["expires_at"])
    return {
        "history": [dto(h) for h in history],
        "balance": get_reward_balance(conn, user_id),
        "earned": sum(h["points"] for h in history if h["points"] > 0),
        "redeemed": sum(-h["points"] for h in history if h["points"] < 0),
        "nextExpiry": dto({"at": expiring[0]})["at"] if expiring else None,
        "referrals": [{"referral": dto(r, omit=("friend_name",)), "friendName": r["friend_name"]} for r in referral_rows],
    }
