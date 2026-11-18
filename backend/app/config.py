"""Configurable business rules.

Delivery charges, minimum orders, slots, cut-offs, reward rates and referral
rules live in the ``settings`` table so they can change without a deploy.
``seed_data.json`` only supplies placeholder defaults for an empty database.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import psycopg

SEED: dict[str, Any] = json.loads((Path(__file__).parent / "seed_data.json").read_text(encoding="utf-8"))
DEFAULT_CONFIG: dict[str, Any] = SEED["config"]


def get_config(conn: psycopg.Connection) -> dict[str, Any]:
    merged = dict(DEFAULT_CONFIG)
    for row in conn.execute("select key, value from settings").fetchall():
        if row["key"] in DEFAULT_CONFIG:
            merged[row["key"]] = row["value"]
    return merged


def stripe_configured() -> bool:
    return bool(os.environ.get("STRIPE_SECRET_KEY"))
