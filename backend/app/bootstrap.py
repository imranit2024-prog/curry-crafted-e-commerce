"""First-run setup: create the schema if it is missing and seed an empty catalogue.

``schema.sql`` is exported from the Drizzle schema in ``src/db/schema.ts``
(``npx drizzle-kit export --sql``), which remains the single schema definition.
Both steps are idempotent, so this is safe to run on every start.
"""

from __future__ import annotations

import logging
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb

from .config import SEED

log = logging.getLogger("curry_crafted")


def bootstrap(conn: psycopg.Connection) -> None:
    if conn.execute("select to_regclass('public.products') as t").fetchone()["t"] is None:
        log.info("Creating database schema from schema.sql")
        conn.execute((Path(__file__).parent / "schema.sql").read_text(encoding="utf-8"))

    if conn.execute("select count(*)::int as n from products").fetchone()["n"] > 0:
        return

    log.info("Seeding placeholder catalogue and business rules")
    with conn.transaction():
        for p in SEED["products"]:
            conn.execute(
                """
                insert into products (slug, name, range, category, short_description, description, image, gallery, variants,
                                      dietary, spice_level, ingredients, allergens, may_contain, nutrition, storage, preparation,
                                      servings, active, in_stock, max_per_order, popularity, featured, created_at)
                values (%(slug)s, %(name)s, %(range)s, %(category)s, %(shortDescription)s, %(description)s, %(image)s, %(gallery)s,
                        %(variants)s, %(dietary)s, %(spiceLevel)s, %(ingredients)s, %(allergens)s, %(mayContain)s, %(nutrition)s,
                        %(storage)s, %(preparation)s, %(servings)s, %(active)s, %(inStock)s, %(maxPerOrder)s, %(popularity)s,
                        %(featured)s, now() - make_interval(days => %(daysAgo)s))
                on conflict (slug) do nothing
                """,
                {
                    **p,
                    "gallery": Jsonb(p["gallery"]),
                    "variants": Jsonb(p["variants"]),
                    "dietary": Jsonb(p["dietary"]),
                    "allergens": Jsonb(p["allergens"]),
                    "mayContain": Jsonb(p["mayContain"]),
                    "nutrition": Jsonb(p["nutrition"]) if p["nutrition"] is not None else None,
                    "preparation": Jsonb(p["preparation"]),
                },
            )
        for b in SEED["bundles"]:
            conn.execute(
                """
                insert into bundles (slug, name, description, image, range, serves, mains_count, sides_count, price_pence, sort_order)
                values (%(slug)s, %(name)s, %(description)s, %(image)s, %(range)s, %(serves)s, %(mainsCount)s, %(sidesCount)s,
                        %(pricePence)s, %(sortOrder)s)
                on conflict (slug) do nothing
                """,
                b,
            )
        for prefix in SEED["chilledPostcodes"]:
            conn.execute("insert into chilled_postcodes (prefix) values (%s) on conflict (prefix) do nothing", (prefix,))
        for r in SEED["frozenRestrictions"]:
            conn.execute(
                "insert into frozen_restrictions (prefix, kind, surcharge_pence, note) values (%(prefix)s, %(kind)s, %(surchargePence)s, %(note)s) on conflict (prefix) do nothing",
                r,
            )
        for c in SEED["promoCodes"]:
            conn.execute(
                "insert into promo_codes (code, kind, value, min_spend_pence, description) values (%(code)s, %(kind)s, %(value)s, %(minSpendPence)s, %(description)s) on conflict (code) do nothing",
                c,
            )
        for key, value in SEED["config"].items():
            conn.execute("insert into settings (key, value) values (%s, %s) on conflict (key) do nothing", (key, Jsonb(value)))
