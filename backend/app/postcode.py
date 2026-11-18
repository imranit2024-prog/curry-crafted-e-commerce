"""Delivery eligibility engine.

- Chilled: only postcodes whose outward code (or whole area) is listed in ``chilled_postcodes``.
- Frozen: UK-wide, unless the area/outward code is listed in ``frozen_restrictions``
  as excluded or as a surcharge area.

A syntactically valid UK postcode never qualifies for chilled delivery by default.
"""

from __future__ import annotations

import re
from typing import Any

import psycopg

UK_POSTCODE = re.compile(r"^([A-Z]{1,2}[0-9][A-Z0-9]?)([0-9][A-Z]{2})$")


def parse_postcode(raw: Any) -> dict[str, str] | None:
    compact = re.sub(r"[^A-Z0-9]", "", str(raw or "").upper())
    match = UK_POSTCODE.match(compact)
    if not match:
        return None
    outward, inward = match.group(1), match.group(2)
    area = re.match(r"^[A-Z]+", outward).group(0)  # type: ignore[union-attr]
    return {"outward": outward, "inward": inward, "area": area, "formatted": f"{outward} {inward}"}


def check_postcode(conn: psycopg.Connection, raw: Any) -> dict[str, Any]:
    """Returns ``{"valid": False, "error": str}`` or ``{"valid": True, "result": PostcodeResult}``."""
    if not raw or not str(raw).strip():
        return {"valid": False, "error": "Enter a postcode to check delivery."}
    parsed = parse_postcode(raw)
    if not parsed:
        return {"valid": False, "error": "That doesn't look like a full UK postcode. Try something like DY9 8DU."}

    chilled_rows = conn.execute("select prefix, active from chilled_postcodes").fetchall()
    frozen_rows = conn.execute("select prefix, kind, surcharge_pence, note from frozen_restrictions").fetchall()

    def matches(prefix: str) -> bool:
        return prefix in (parsed["outward"], parsed["area"])

    chilled = any(r["active"] and matches(r["prefix"].upper()) for r in chilled_rows)
    # The most specific rule wins: an outward code beats its postcode area.
    restriction = next((r for r in frozen_rows if r["prefix"].upper() == parsed["outward"]), None) or next(
        (r for r in frozen_rows if r["prefix"].upper() == parsed["area"]), None
    )
    kind = restriction["kind"] if restriction else None
    return {
        "valid": True,
        "result": {
            "postcode": parsed["formatted"],
            "outward": parsed["outward"],
            "chilled": chilled,
            "frozen": kind != "excluded",
            "frozenSurchargePence": restriction["surcharge_pence"] if kind == "surcharge" else 0,
            "frozenNote": (restriction["note"] or None) if restriction else None,
        },
    }
