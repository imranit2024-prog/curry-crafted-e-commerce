"""Basket quote: the single source of truth for pricing and eligibility.

The browser only ever sends product ids and quantities. Names, prices,
availability, delivery rules, discounts and totals are all resolved here from
the database, on every basket change and again when the order is placed.
"""

from __future__ import annotations

from typing import Any

import psycopg

from .catalog import MAIN_CATEGORIES, get_bundles, get_products
from .config import get_config
from .postcode import check_postcode
from .util import format_price, text, whole


def get_reward_balance(conn: psycopg.Connection, user_id: int) -> int:
    row = conn.execute("select coalesce(sum(points), 0)::int as total from reward_transactions where user_id = %s", (user_id,)).fetchone()
    return max(0, row["total"])


def _count(n: int, word: str) -> str:
    return f"{n} {word}{'' if n == 1 else 's'}"


def build_quote(
    conn: psycopg.Connection,
    *,
    lines: Any,
    postcode: str | None = None,
    promo_code: str | None = None,
    redeem_points: int | None = 0,
    user_id: int | None = None,
) -> dict[str, Any]:
    config = get_config(conn)
    products = get_products(conn)
    bundles = get_bundles(conn, products)
    pc: dict[str, Any] | None = None
    if postcode:
        checked = check_postcode(conn, postcode)
        pc = checked["result"] if checked["valid"] else None
    product_by_id = {p["id"]: p for p in products}
    bundle_by_id = {b["id"]: b for b in bundles}

    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for raw in (lines if isinstance(lines, list) else [])[:60]:
        if not isinstance(raw, dict):
            continue
        key = raw.get("key")
        if not isinstance(key, str) or key in seen:
            continue
        wanted = whole(raw.get("qty"))
        if wanted is None or wanted < 1:
            continue
        seen.add(key)
        kind = raw.get("type")

        gone = {
            "key": key,
            "type": "bundle" if kind == "bundle" else "product",
            "refId": 0,
            "slug": None,
            "name": "Item no longer available",
            "image": "",
            "range": "frozen",
            "variantId": None,
            "variantLabel": None,
            "qty": wanted,
            "maxQty": wanted,
            "unitPricePence": 0,
            "lineTotalPence": 0,
            "purchasable": False,
            "eligible": False,
            "issue": "This item has been removed from our menu.",
            "contents": None,
        }

        if kind == "product":
            p = product_by_id.get(whole(raw.get("productId")))
            if not p:
                out.append(gone)
                continue
            variant = next((v for v in p["variants"] if v["id"] == raw.get("variantId")), None) or (p["variants"][0] if p["variants"] else None)
            qty = min(wanted, p["maxPerOrder"])
            price = variant["pricePence"] if variant else 0
            issue = None
            if not p["available"]:
                issue = "Currently unavailable. Remove this item to continue."
            elif wanted > p["maxPerOrder"]:
                issue = f"Limited to {p['maxPerOrder']} per order."
            out.append(
                {
                    "key": key,
                    "type": "product",
                    "refId": p["id"],
                    "slug": p["slug"],
                    "name": p["name"],
                    "image": p["image"],
                    "range": p["range"],
                    "variantId": variant["id"] if variant else None,
                    "variantLabel": variant["label"] if variant else None,
                    "qty": qty,
                    "maxQty": p["maxPerOrder"],
                    "unitPricePence": price,
                    "lineTotalPence": price * qty,
                    "purchasable": p["available"],
                    "eligible": True,
                    "issue": issue,
                    "contents": None,
                }
            )
        elif kind == "bundle":
            b = bundle_by_id.get(whole(raw.get("bundleId")))
            if not b:
                out.append(gone)
                continue
            mains = sides = 0
            problem: str | None = None
            contents: list[dict[str, Any]] = []
            selections = raw.get("selections") if isinstance(raw.get("selections"), list) else []
            for sel in selections:
                if not isinstance(sel, dict):
                    continue
                sel_qty = whole(sel.get("qty"))
                if sel_qty is None or sel_qty <= 0:
                    continue
                product = product_by_id.get(whole(sel.get("productId")))
                if not product or not product["available"]:
                    problem = "A dish in this bundle is no longer available. Rebuild the bundle to continue."
                    continue
                # Bundles are never mixed-range: chilled and frozen are fulfilled separately.
                if product["range"] != b["range"]:
                    problem = f"This is a {b['range']} bundle and can only contain {b['range']} dishes."
                    continue
                if product["category"] in MAIN_CATEGORIES:
                    mains += sel_qty
                else:
                    sides += sel_qty
                contents.append({"productId": product["id"], "name": product["name"], "qty": sel_qty})
            if not problem and (mains != b["mainsCount"] or sides != b["sidesCount"]):
                problem = f"This bundle needs exactly {_count(b['mainsCount'], 'main')} and {_count(b['sidesCount'], 'side')}."
            qty = min(wanted, 6)
            out.append(
                {
                    "key": key,
                    "type": "bundle",
                    "refId": b["id"],
                    "slug": b["slug"],
                    "name": b["name"],
                    "image": b["image"],
                    "range": b["range"],
                    "variantId": None,
                    "variantLabel": f"{_count(b['mainsCount'], 'main')} + {_count(b['sidesCount'], 'side')}",
                    "qty": qty,
                    "maxQty": 6,
                    "unitPricePence": b["pricePence"],
                    "lineTotalPence": b["pricePence"] * qty,
                    "purchasable": not problem,
                    "eligible": True,
                    "issue": problem,
                    "contents": contents,
                }
            )

    # Delivery eligibility is validated independently for each range.
    for line in out:
        if not line["purchasable"]:
            continue
        if line["range"] == "chilled":
            if not pc:
                line["eligible"] = False
                line["issue"] = line["issue"] or "Check your postcode to confirm chilled delivery."
            elif not pc["chilled"]:
                line["eligible"] = False
                line["issue"] = line["issue"] or f"Chilled delivery isn't available for {pc['postcode']}."
        elif pc and not pc["frozen"]:
            line["eligible"] = False
            line["issue"] = line["issue"] or pc["frozenNote"] or f"Frozen delivery isn't available for {pc['postcode']}."

    def group(range_: str) -> dict[str, Any] | None:
        mine = [l for l in out if l["range"] == range_ and l["purchasable"]]
        if not mine:
            return None
        rules = config["delivery"][range_]
        subtotal = sum(l["lineTotalPence"] for l in mine)
        if range_ == "chilled":
            status = "unchecked" if not pc else "ok" if pc["chilled"] else "ineligible"
        else:
            status = "ineligible" if pc and not pc["frozen"] else "ok"
        surcharge = pc["frozenSurchargePence"] if range_ == "frozen" and pc and pc["frozen"] else 0
        free = rules["freeOverPence"] is not None and subtotal >= rules["freeOverPence"]
        delivery = 0 if status == "ineligible" else (0 if free else rules["chargePence"]) + surcharge
        if range_ == "chilled":
            if status == "ok":
                message = f"Chilled delivery is available for {pc['postcode']}. You'll choose a delivery day and time slot at checkout."
            elif status == "unchecked":
                message = "Chilled meals are delivered to selected postcodes only. Check your postcode to continue."
            else:
                message = f"Sorry, we don't deliver chilled meals to {pc['postcode']}. Remove these items or try our frozen range, delivered UK-wide."
        elif status == "ineligible":
            message = pc["frozenNote"] or f"Frozen delivery isn't available for {pc['postcode']}."
        elif pc:
            extra = f" {pc['frozenNote'] or ''} (+{format_price(surcharge)})" if surcharge else ""
            message = f"Frozen delivery is available for {pc['postcode']} by tracked courier.{extra}"
        else:
            message = "Frozen meals are delivered UK-wide by tracked courier. Some remote postcodes carry a surcharge, confirmed at checkout."
        return {
            "range": range_,
            "itemCount": sum(l["qty"] for l in mine),
            "subtotalPence": subtotal,
            "deliveryPence": delivery,
            "surchargePence": surcharge,
            "minOrderPence": rules["minOrderPence"],
            "remainingToMinPence": max(0, rules["minOrderPence"] - subtotal),
            "freeOverPence": rules["freeOverPence"],
            "remainingToFreePence": None if rules["freeOverPence"] is None else max(0, rules["freeOverPence"] - subtotal),
            "status": status,
            "message": message.strip(),
        }

    chilled = group("chilled")
    frozen = group("frozen")
    subtotal = sum(l["lineTotalPence"] for l in out if l["purchasable"])

    # Promotional code
    promo: dict[str, Any] | None = None
    code = text(promo_code or "", 40).upper()
    if code:
        row = conn.execute("select * from promo_codes where code = %s", (code,)).fetchone()
        if not row or not row["active"]:
            promo = {"code": code, "valid": False, "message": "That code isn't recognised.", "discountPence": 0}
        elif subtotal < row["min_spend_pence"]:
            promo = {"code": code, "valid": False, "message": f"Spend {format_price(row['min_spend_pence'])} or more to use {code}.", "discountPence": 0}
        else:
            # Percentages round half-up to the nearest penny.
            discount = (subtotal * row["value"] + 50) // 100 if row["kind"] == "percent" else min(row["value"], subtotal)
            promo = {"code": code, "valid": True, "message": row["description"] or "Code applied.", "discountPence": discount}
    discount = promo["discountPence"] if promo and promo["valid"] else 0

    # Reward redemption, validated against the live balance. At least £1 of goods stays payable by card.
    r = config["rewards"]
    balance = get_reward_balance(conn, user_id) if user_id else 0
    max_redeemable = min(balance, max(0, subtotal - discount - 100) // r["pointValuePence"])
    if max_redeemable < r["minRedeemPoints"]:
        max_redeemable = 0
    applied = min(max(0, redeem_points or 0), max_redeemable)
    if applied < r["minRedeemPoints"]:
        applied = 0
    reward_discount = applied * r["pointValuePence"]

    delivery = (chilled["deliveryPence"] if chilled else 0) + (frozen["deliveryPence"] if frozen else 0)
    total = subtotal - discount - reward_discount + delivery
    points_to_earn = ((subtotal - discount - reward_discount) // 100) * r["pointsPerPound"] * (2 if r["doublePoints"]["active"] else 1)

    blockers: list[str] = []
    if not out:
        blockers.append("Your basket is empty.")
    if any(not l["purchasable"] for l in out):
        blockers.append("Remove unavailable items to continue.")
    for g in (chilled, frozen):
        if not g:
            continue
        label = g["range"]
        if g["status"] == "unchecked":
            blockers.append("Check your postcode to confirm chilled delivery.")
        elif g["status"] == "ineligible":
            blockers.append(f"Remove {label} items: {label} delivery isn't available for {pc['postcode'] if pc else 'your postcode'}.")
        elif g["remainingToMinPence"] > 0:
            blockers.append(
                f"Add {format_price(g['remainingToMinPence'])} more from the {label} range to reach the {format_price(g['minOrderPence'])} {label} minimum."
            )

    return {
        "lines": out,
        "chilled": chilled,
        "frozen": frozen,
        "postcode": pc,
        "promo": promo,
        "rewards": {
            "signedIn": bool(user_id),
            "balance": balance,
            "maxRedeemable": max_redeemable,
            "applied": applied,
            "discountPence": reward_discount,
            "pointValuePence": r["pointValuePence"],
            "minRedeemPoints": r["minRedeemPoints"],
        },
        "subtotalPence": subtotal,
        "discountPence": discount,
        "rewardDiscountPence": reward_discount,
        "deliveryPence": delivery,
        "totalPence": total,
        "pointsToEarn": points_to_earn,
        "blockers": blockers,
        "canCheckout": not blockers,
    }
