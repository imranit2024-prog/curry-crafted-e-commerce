"""Advance-ordering schedule.

Chilled: bookable delivery days and time slots, with order cut-offs and per-slot capacity.
Frozen: next courier dispatch day and an estimated delivery window (no time slots).
All dates are calendar dates in Europe/London.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

import psycopg

LONDON = ZoneInfo("Europe/London")
SLOT_HOLD_MINUTES = 30  # unpaid orders hold their slot for this long
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

# An order occupies its slot once paid, or while a recent checkout attempt is still in progress.
SLOT_HOLD_SQL = "status <> 'cancelled' and (payment_status = 'paid' or created_at > %s)"


def hold_cutoff() -> datetime:
    return datetime.now(timezone.utc) - timedelta(minutes=SLOT_HOLD_MINUTES)


def london_now() -> tuple[date, int]:
    now = datetime.now(LONDON)
    return now.date(), now.hour


def js_weekday(d: date) -> int:
    """0 = Sunday … 6 = Saturday (the convention used in the stored configuration)."""
    return (d.weekday() + 1) % 7


def fmt(d: date, weekday: str | None = None, day: bool = False, month: str | None = None) -> str:
    parts: list[str] = []
    if weekday:
        name = WEEKDAYS[d.weekday()]
        parts.append(name if weekday == "long" else name[:3])
    if day:
        parts.append(str(d.day))
    if month:
        name = MONTHS[d.month - 1]
        parts.append(name if month == "long" else name[:3])
    return " ".join(parts)


def hour_label(hour: int) -> str:
    if hour == 12:
        return "12 noon"
    if hour == 0:
        return "midnight"
    return f"{hour - 12}pm" if hour > 12 else f"{hour}am"


def get_frozen_estimate(config: dict[str, Any]) -> dict[str, Any]:
    f = config["frozenSchedule"]
    today, hour = london_now()
    dispatch = today
    for i in range(21):
        d = today + timedelta(days=i)
        past_cutoff = i == 0 and hour >= f["cutoffHour"]
        if js_weekday(d) in f["dispatchWeekdays"] and not past_cutoff:
            dispatch = d
            break
    start = dispatch + timedelta(days=f["transitDaysMin"])
    end = dispatch + timedelta(days=f["transitDaysMax"])
    short = lambda d: fmt(d, weekday="short", day=True, month="short")  # noqa: E731
    return {
        "dispatchDate": dispatch.isoformat(),
        "dispatchLabel": fmt(dispatch, weekday="long", day=True, month="long"),
        "estimateLabel": short(start) if start == end else f"{short(start)} – {short(end)}",
        "cutoffLabel": f"Order by {hour_label(f['cutoffHour'])} on {fmt(dispatch, weekday='long')} for this dispatch",
    }


def get_chilled_dates(conn: psycopg.Connection, config: dict[str, Any]) -> list[dict[str, Any]]:
    c = config["chilledSchedule"]
    today, hour = london_now()
    booked = conn.execute(
        f"""
        select chilled_date, chilled_slot_id, count(*)::int as n
        from orders
        where chilled_date is not null and chilled_date >= %s and {SLOT_HOLD_SQL}
        group by chilled_date, chilled_slot_id
        """,
        (today.isoformat(), hold_cutoff()),
    ).fetchall()
    taken = {(b["chilled_date"], b["chilled_slot_id"]): b["n"] for b in booked}

    dates: list[dict[str, Any]] = []
    for i in range(c["horizonDays"] + 1):
        if len(dates) >= 8:
            break
        d = today + timedelta(days=i)
        if js_weekday(d) not in c["deliveryWeekdays"]:
            continue
        cutoff = d - timedelta(days=c["cutoffDaysBefore"])
        is_open = today < cutoff or (today == cutoff and hour < c["cutoffHour"])
        slots = []
        for s in c["slots"]:
            remaining = max(0, c["capacityPerSlot"] - taken.get((d.isoformat(), s["id"]), 0))
            slots.append({"id": s["id"], "label": s["label"], "remaining": remaining, "available": is_open and remaining > 0})
        dates.append(
            {
                "date": d.isoformat(),
                "weekday": fmt(d, weekday="short"),
                "dayLabel": fmt(d, day=True, month="short"),
                "longLabel": fmt(d, weekday="long", day=True, month="long"),
                "cutoffLabel": f"Order by {hour_label(c['cutoffHour'])} on {fmt(cutoff, weekday='long', day=True, month='short')}",
                "open": is_open,
                "slots": slots,
            }
        )
    return dates


def get_schedule(conn: psycopg.Connection, config: dict[str, Any]) -> dict[str, Any]:
    return {"chilled": get_chilled_dates(conn, config), "frozen": get_frozen_estimate(config)}
