"""Product and bundle catalogue reads."""

from __future__ import annotations

from typing import Any

import psycopg

from .util import iso

MAIN_CATEGORIES = ("chicken", "lamb", "vegetarian")


def _product(row: dict[str, Any]) -> dict[str, Any]:
    variants = row["variants"] or []
    return {
        "id": row["id"],
        "slug": row["slug"],
        "name": row["name"],
        "range": row["range"],
        "category": row["category"],
        "shortDescription": row["short_description"],
        "description": row["description"],
        "image": row["image"],
        "gallery": row["gallery"] or [row["image"]],
        "pricePence": variants[0]["pricePence"] if variants else 0,
        "variants": variants,
        "dietary": row["dietary"] or [],
        "spiceLevel": row["spice_level"],
        "ingredients": row["ingredients"],
        "allergens": row["allergens"] or [],
        "mayContain": row["may_contain"] or [],
        "nutrition": row["nutrition"],
        "storage": row["storage"],
        "preparation": row["preparation"] or [],
        "servings": row["servings"],
        # Listed products can still be un-purchasable (out of stock).
        "available": bool(row["active"] and row["in_stock"] and variants),
        "maxPerOrder": row["max_per_order"],
        "popularity": row["popularity"],
        "featured": row["featured"],
        "createdAt": iso(row["created_at"]),
    }


def get_products(conn: psycopg.Connection) -> list[dict[str, Any]]:
    rows = conn.execute("select * from products where active = true").fetchall()
    return sorted((_product(r) for r in rows), key=lambda p: -p["popularity"])


def get_bundles(conn: psycopg.Connection, products: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    products = products if products is not None else get_products(conn)
    rows = conn.execute("select * from bundles where active = true order by sort_order asc").fetchall()
    bundles = []
    for b in rows:
        eligible = [p for p in products if p["range"] == b["range"] and p["available"]]
        max_main = max([p["pricePence"] for p in eligible if p["category"] in MAIN_CATEGORIES], default=0)
        max_side = max([p["pricePence"] for p in eligible if p["category"] not in MAIN_CATEGORIES], default=0)
        max_value = max_main * b["mains_count"] + max_side * b["sides_count"]
        bundles.append(
            {
                "id": b["id"],
                "slug": b["slug"],
                "name": b["name"],
                "description": b["description"],
                "image": b["image"],
                "range": b["range"],
                "serves": b["serves"],
                "mainsCount": b["mains_count"],
                "sidesCount": b["sides_count"],
                "pricePence": b["price_pence"],
                # Largest possible saving versus buying the same items individually at today's prices.
                "saveUpToPence": max(0, max_value - b["price_pence"]),
            }
        )
    return bundles


def search_products(products: list[dict[str, Any]], query: str) -> list[dict[str, Any]]:
    terms = [t for t in query.lower().split() if t]
    if not terms:
        return []
    scored = []
    for p in products:
        name = p["name"].lower()
        hay = " ".join(
            [name, p["category"], p["range"], p["shortDescription"], p["description"], " ".join(p["dietary"]), p["ingredients"]]
        ).lower()
        if not all(t in hay for t in terms):
            continue
        score = sum(6 if name.startswith(t) else 4 if t in name else 2 if (t in p["category"] or t in p["range"]) else 1 for t in terms)
        scored.append((score, p))
    scored.sort(key=lambda sp: (-sp[0], -sp[1]["popularity"]))
    return [p for _, p in scored]
