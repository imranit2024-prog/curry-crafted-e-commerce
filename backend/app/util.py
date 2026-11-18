"""Small shared helpers: input coercion, formatting and JSON shaping."""

from __future__ import annotations

import math
import re
from datetime import datetime, timezone
from typing import Any

from fastapi.responses import JSONResponse

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
PHONE_RE = re.compile(r"^[0-9+()\s-]{7,20}$")


def text(value: Any, max_len: int = 200) -> str:
    """Trimmed, length-capped string; anything that isn't a string becomes ''."""
    return value.strip()[:max_len] if isinstance(value, str) else ""


def number(value: Any) -> float | None:
    """Lenient numeric coercion for untrusted JSON. Returns None when the value isn't a finite number."""
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, (int, float)):
        return float(value) if math.isfinite(value) else None
    if isinstance(value, str):
        try:
            parsed = float(value.strip())
        except ValueError:
            return None
        return parsed if math.isfinite(parsed) else None
    return None


def whole(value: Any) -> int | None:
    parsed = number(value)
    return None if parsed is None else math.floor(parsed)


def format_price(pence: int) -> str:
    sign = "-" if pence < 0 else ""
    return f"{sign}£{abs(pence) / 100:.2f}"


def plural(count: int, word: str) -> str:
    return f"{count} {word}{'' if count == 1 else 's'}"


def iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def camel(key: str) -> str:
    head, *rest = key.split("_")
    return head + "".join(part.title() for part in rest)


def dto(row: dict[str, Any], omit: tuple[str, ...] = ()) -> dict[str, Any]:
    """Database row (snake_case) -> API object (camelCase, ISO timestamps)."""
    return {camel(k): (iso(v) if isinstance(v, datetime) else v) for k, v in row.items() if k not in omit}


def fail(error: str, status: int = 400, **extra: Any) -> JSONResponse:
    body: dict[str, Any] = {"error": error}
    body.update({k: v for k, v in extra.items() if v is not None})
    return JSONResponse(body, status_code=status)
