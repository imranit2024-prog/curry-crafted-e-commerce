"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScheduleDTO } from "@/lib/types";
import { Icon, RangeBadge, btn, cx } from "./ui";

export type ScheduleState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: ScheduleDTO };

export function useSchedule(): [ScheduleState, () => void] {
  const [state, setState] = useState<ScheduleState>({ status: "loading" });
  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/schedule", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setState({ status: "ready", data: data.schedule });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error && err.message ? err.message : "We couldn't load delivery dates just now." });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return [state, load];
}

export type SlotChoice = { date: string | null; slotId: string | null };

export function ChilledSlotPicker({ data, value, onChange, idPrefix = "slot" }: { data: ScheduleDTO; value: SlotChoice; onChange: (next: SlotChoice) => void; idPrefix?: string }) {
  const selected = data.chilled.find((d) => d.date === value.date) ?? null;
  return (
    <div>
      <p id={`${idPrefix}-date-label`} className="text-sm font-semibold text-forest">
        1. Choose a delivery day
      </p>
      <div role="radiogroup" aria-labelledby={`${idPrefix}-date-label`} className="no-scrollbar -mx-1 mt-3 flex gap-2.5 overflow-x-auto px-1 pb-2">
        {data.chilled.map((d) => {
          const active = d.date === value.date;
          const full = d.open && d.slots.every((s) => !s.available);
          const disabled = !d.open || full;
          return (
            <button
              key={d.date}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange({ date: d.date, slotId: null })}
              aria-label={`${d.longLabel}${!d.open ? ", order cut-off has passed" : full ? ", fully booked" : ""}`}
              className={cx(
                "flex w-[4.75rem] flex-none flex-col items-center rounded-2xl border px-2 py-3 transition-all duration-300 ease-[var(--ease-expo)]",
                active ? "border-forest bg-forest text-cream shadow-[var(--shadow-card)]" : "border-forest/15 bg-white text-forest hover:border-forest/50",
                disabled && "border-dashed bg-transparent text-charcoal/40 hover:border-forest/15",
              )}
            >
              <span className={cx("text-[0.68rem] font-bold uppercase tracking-[0.16em]", active ? "text-gold" : "")}>{d.weekday}</span>
              <span className={cx("display mt-1 text-2xl leading-none", disabled && "line-through decoration-1")}>{d.dayLabel.split(" ")[0]}</span>
              <span className="mt-1 text-[0.68rem] font-medium">{d.dayLabel.split(" ")[1]}</span>
              <span className="mt-1.5 text-[0.6rem] font-semibold uppercase tracking-wider">{!d.open ? "Closed" : full ? "Full" : " "}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5" aria-live="polite">
        <p id={`${idPrefix}-time-label`} className="text-sm font-semibold text-forest">
          2. Choose a time slot
        </p>
        {!selected ? (
          <p className="mt-3 rounded-2xl border border-dashed border-forest/20 px-4 py-5 text-sm text-charcoal/65">Select a delivery day to see the time slots available.</p>
        ) : (
          <>
            <div role="radiogroup" aria-labelledby={`${idPrefix}-time-label`} className="mt-3 grid gap-2.5 sm:grid-cols-3">
              {selected.slots.map((s) => {
                const active = value.slotId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!s.available}
                    onClick={() => onChange({ date: selected.date, slotId: s.id })}
                    className={cx(
                      "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 sm:flex-col sm:items-start",
                      active ? "border-forest bg-forest text-cream" : "border-forest/15 bg-white text-forest hover:border-forest/50",
                      !s.available && "border-dashed bg-transparent text-charcoal/40 hover:border-forest/15",
                    )}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <Icon name={active ? "check" : "clock"} className={cx("h-4 w-4", active && "text-gold")} />
                      <span className={!s.available ? "line-through decoration-1" : ""}>{s.label}</span>
                    </span>
                    <span className={cx("text-xs font-medium", active ? "text-cream/75" : !s.available ? "" : "text-charcoal/65")}>
                      {!s.available ? (selected.open ? "Fully booked" : "Closed") : s.remaining <= 3 ? `Only ${s.remaining} left` : "Available"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs font-medium text-charcoal/70">
              <Icon name="clock" className="h-4 w-4 text-forest" /> {selected.cutoffLabel} for delivery on {selected.longLabel}.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function FrozenEstimate({ data, compact = false }: { data: ScheduleDTO; compact?: boolean }) {
  return (
    <dl className={cx("grid gap-4", !compact && "sm:grid-cols-2")}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-forest text-gold">
          <Icon name="box" className="h-4 w-4" />
        </span>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-charcoal/60">Next dispatch</dt>
          <dd className="mt-0.5 font-semibold text-forest">{data.frozen.dispatchLabel}</dd>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-forest text-gold">
          <Icon name="truck" className="h-4 w-4" />
        </span>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-charcoal/60">Estimated delivery</dt>
          <dd className="mt-0.5 font-semibold text-forest">{data.frozen.estimateLabel}</dd>
        </div>
      </div>
      <p className={cx("flex items-center gap-2 text-xs font-medium text-charcoal/70", !compact && "sm:col-span-2")}>
        <Icon name="clock" className="h-4 w-4 text-forest" /> {data.frozen.cutoffLabel}. Frozen orders arrive by tracked courier, so there are no time slots to choose.
      </p>
    </dl>
  );
}

export function ScheduleSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading delivery dates">
      <div className="flex gap-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-24 w-[4.75rem] flex-none" />
        ))}
      </div>
      <div className="skeleton mt-5 h-14" />
    </div>
  );
}

/** Live, browse-only preview of the delivery schedule (homepage and delivery page). */
export function SchedulePreview() {
  const [state, reload] = useSchedule();
  const [choice, setChoice] = useState<SlotChoice>({ date: null, slotId: null });

  useEffect(() => {
    if (state.status === "ready" && !choice.date) {
      const first = state.data.chilled.find((d) => d.open && d.slots.some((s) => s.available));
      if (first) setChoice({ date: first.date, slotId: null });
    }
  }, [state, choice.date]);

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-lift)] ring-1 ring-forest/5">
      <div className="p-6 md:p-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <RangeBadge range="chilled" />
          <span className="text-xs font-medium text-charcoal/60">Live availability</span>
        </div>
        {state.status === "loading" && <ScheduleSkeleton />}
        {state.status === "error" && (
          <div role="alert" className="rounded-2xl bg-danger-soft p-4 text-sm font-medium text-danger">
            {state.message}
            <button type="button" onClick={reload} className={btn("outline", "sm", "mt-3 flex")}>
              <Icon name="refresh" className="h-4 w-4" /> Try again
            </button>
          </div>
        )}
        {state.status === "ready" && <ChilledSlotPicker data={state.data} value={choice} onChange={setChoice} idPrefix="preview" />}
      </div>
      <div className="border-t border-forest/10 bg-sage p-6 md:p-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <RangeBadge range="frozen" />
          <span className="text-xs font-medium text-charcoal/60">Courier delivery</span>
        </div>
        {state.status === "ready" ? <FrozenEstimate data={state.data} /> : state.status === "loading" ? <div className="skeleton h-16" /> : <p className="text-sm text-charcoal/70">Dispatch information is unavailable right now.</p>}
      </div>
    </div>
  );
}
