"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MAIN_CATEGORIES, formatPrice, type BundleDTO, type ProductDTO, type Range } from "@/lib/types";
import { bundleContents } from "./blocks";
import { QuantitySelector } from "./client-ui";
import { ChilledStatus } from "./postcode";
import { useStore } from "./store";
import { DietaryTags, Icon, Notice, RangeBadge, SpiceLevel, btn, cx } from "./ui";

const STEPS = ["Choose a bundle", "Select mains", "Select sides", "Review"];

function Meter({ label, have, need }: { label: string; have: number; need: number }) {
  const pct = need === 0 ? 100 : Math.round((have / need) * 100);
  const done = have === need;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-cream">{label}</span>
        <span className={cx("flex items-center gap-1.5 tabular-nums", done ? "text-gold" : "text-cream/75")}>
          {done && (
            <span key="done" className="pop inline-flex">
              <Icon name="check" className="h-4 w-4" />
            </span>
          )}
          {have} of {need}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream/15" role="progressbar" aria-valuemin={0} aria-valuemax={need} aria-valuenow={have} aria-label={`${label} selected`}>
        <div className="progress-fill h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BundleBuilder({ bundles, products, initialSlug, initialRange }: { bundles: BundleDTO[]; products: ProductDTO[]; initialSlug?: string; initialRange?: Range }) {
  const { addBundle, setDrawerOpen } = useStore();
  const preset = bundles.find((b) => b.slug === initialSlug) ?? null;
  const [range, setRange] = useState<Range>(preset?.range ?? initialRange ?? "chilled");
  const [bundleId, setBundleId] = useState<number | null>(preset?.id ?? null);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [step, setStep] = useState(preset ? 1 : 0);
  const [done, setDone] = useState(false);

  const bundle = bundles.find((b) => b.id === bundleId) ?? null;
  const pool = useMemo(() => products.filter((p) => p.range === range), [products, range]);
  const mains = pool.filter((p) => MAIN_CATEGORIES.includes(p.category));
  const sides = pool.filter((p) => !MAIN_CATEGORIES.includes(p.category));
  const count = (list: ProductDTO[]) => list.reduce((s, p) => s + (picks[p.id] ?? 0), 0);
  const mainsHave = count(mains);
  const sidesHave = count(sides);
  const mainsNeed = bundle?.mainsCount ?? 0;
  const sidesNeed = bundle?.sidesCount ?? 0;
  const complete = Boolean(bundle) && mainsHave === mainsNeed && sidesHave === sidesNeed;
  const chosen = pool.filter((p) => (picks[p.id] ?? 0) > 0);
  const separately = chosen.reduce((s, p) => s + p.pricePence * picks[p.id], 0);
  const saving = bundle && complete ? separately - bundle.pricePence : 0;

  const chooseRange = (r: Range) => {
    if (r === range) return;
    setRange(r);
    setBundleId(null);
    setPicks({});
  };
  const chooseBundle = (b: BundleDTO) => {
    setBundleId(b.id);
    // Keep existing choices only if they still fit the new bundle's limits.
    if (mainsHave > b.mainsCount || sidesHave > b.sidesCount) setPicks({});
    setDone(false);
  };
  const setPick = (p: ProductDTO, qty: number) => setPicks((prev) => ({ ...prev, [p.id]: Math.max(0, qty) }));

  const remaining =
    !bundle
      ? "Choose a bundle to begin."
      : mainsHave < mainsNeed
        ? `Choose ${mainsNeed - mainsHave} more main${mainsNeed - mainsHave === 1 ? "" : "s"}.`
        : sidesHave < sidesNeed
          ? `Choose ${sidesNeed - sidesHave} more side${sidesNeed - sidesHave === 1 ? "" : "s"}.`
          : "Your bundle is complete.";

  const canNext = step === 0 ? Boolean(bundle) : step === 1 ? mainsHave === mainsNeed : step === 2 ? sidesHave === sidesNeed : complete;
  const stepReachable = (i: number) => i === 0 || (Boolean(bundle) && (i === 1 || (i === 2 && mainsHave === mainsNeed) || (i === 3 && complete)));

  const add = () => {
    if (!bundle || !complete) return;
    const result = addBundle(
      bundle,
      chosen.map((p) => ({ productId: p.id, qty: picks[p.id] })),
    );
    if (result === "added") {
      setDone(true);
      setPicks({});
      setStep(0);
      setBundleId(null);
    }
  };

  const picker = (list: ProductDTO[], have: number, need: number, noun: string) => (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-3xl text-forest md:text-4xl">
            Select your {noun}
            {need === 1 ? "" : "s"}
          </h2>
          <p className="mt-1.5 text-sm text-charcoal/75" aria-live="polite">
            {have === need ? `All ${need} chosen. You can swap by removing one first.` : `Choose ${need - have} more. You can pick the same dish more than once.`}
          </p>
        </div>
        <span className={cx("rounded-full px-4 py-2 text-sm font-bold tabular-nums", have === need ? "bg-forest text-gold" : "bg-forest/10 text-forest")}>
          {have} / {need}
        </span>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {list.map((p) => {
          const qty = picks[p.id] ?? 0;
          return (
            <li key={p.id} className={cx("flex gap-4 rounded-2xl border bg-white p-3 transition-all duration-300", qty > 0 ? "border-forest shadow-[var(--shadow-card)]" : "border-forest/10", !p.available && "opacity-55")}>
              <div className="relative h-24 w-24 flex-none overflow-hidden rounded-xl bg-forest">
                <Image src={p.image} alt="" fill sizes="96px" className={cx("object-cover", !p.available && "grayscale")} />
                {qty > 0 && (
                  <span key={qty} className="pop absolute right-1.5 top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-gold px-1 text-xs font-bold text-forest">
                    {qty}
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="font-semibold leading-snug text-forest">{p.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <SpiceLevel level={p.spiceLevel} showLabel={false} />
                  <DietaryTags dietary={p.dietary} />
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <Link href={`/products/${p.slug}`} target="_blank" className="text-xs font-semibold text-forest underline underline-offset-4">
                    Allergens &amp; details<span className="sr-only"> for {p.name} (opens in a new tab)</span>
                  </Link>
                  {!p.available ? (
                    <span className="text-xs font-semibold text-charcoal/60">Unavailable</span>
                  ) : qty === 0 ? (
                    <button type="button" disabled={have >= need} onClick={() => setPick(p, 1)} className={btn("outline", "sm")} aria-label={`Add ${p.name}`}>
                      <Icon name="plus" className="h-4 w-4" /> Add
                    </button>
                  ) : (
                    <QuantitySelector size="sm" min={0} value={qty} max={qty + (need - have)} onChange={(q) => setPick(p, q)} label={`${p.name} quantity`} />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="pb-28 lg:pb-0">
      {/* Progress */}
      <ol className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0" aria-label="Bundle steps">
        {STEPS.map((label, i) => {
          const state = i === step ? "current" : i < step ? "done" : "todo";
          const reachable = stepReachable(i);
          return (
            <li key={label} className="flex-1">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => setStep(i)}
                aria-current={state === "current" ? "step" : undefined}
                className={cx(
                  "flex h-14 w-full min-w-[9.5rem] items-center gap-3 rounded-full border px-4 text-left text-sm font-semibold transition-all duration-500 ease-[var(--ease-expo)]",
                  state === "current" && "border-forest bg-forest text-cream",
                  state === "done" && "border-forest/20 bg-sage text-forest",
                  state === "todo" && "border-forest/10 bg-white text-charcoal/55",
                )}
              >
                <span className={cx("grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-bold", state === "current" ? "bg-gold text-forest" : state === "done" ? "bg-forest text-gold" : "bg-forest/10 text-forest/60")}>
                  {state === "done" ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="whitespace-nowrap">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-10">
        <div key={step} className="fade-up" style={{ animationDelay: "0ms" }}>
          {done && step === 0 && (
            <Notice tone="success" title="Bundle added to your basket" className="mb-6">
              <button type="button" onClick={() => setDrawerOpen(true)} className="font-semibold text-forest underline underline-offset-4">
                View basket
              </button>{" "}
              or build another below.
            </Notice>
          )}

          {step === 0 && (
            <div>
              <h2 className="display text-3xl text-forest md:text-4xl">Choose your bundle</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-charcoal/75">Bundles are built from one range at a time, because chilled and frozen meals are delivered separately.</p>
              <div className="mt-5 inline-grid grid-cols-2 gap-1 rounded-full bg-forest/5 p-1" role="group" aria-label="Bundle range">
                {(["chilled", "frozen"] as const).map((r) => (
                  <button key={r} type="button" aria-pressed={range === r} onClick={() => chooseRange(r)} className={cx("flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold capitalize transition-colors", range === r ? "bg-forest text-cream" : "text-forest hover:bg-forest/10")}>
                    <Icon name={r === "chilled" ? "drop" : "snowflake"} className={cx("h-4 w-4", range === r && "text-gold")} /> {r}
                  </button>
                ))}
              </div>
              {range === "chilled" ? <ChilledStatus className="mt-4" /> : <p className="mt-4 flex items-center gap-2 text-sm text-charcoal/80"><Icon name="truck" className="h-4 w-4 text-forest" /> Frozen bundles are delivered UK-wide by tracked courier.</p>}

              <div role="radiogroup" aria-label="Bundle size" className="mt-6 grid gap-4 md:grid-cols-3">
                {bundles
                  .filter((b) => b.range === range)
                  .map((b) => {
                    const active = b.id === bundleId;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => chooseBundle(b)}
                        className={cx("group flex flex-col overflow-hidden rounded-3xl border-2 bg-white text-left transition-all duration-500 ease-[var(--ease-expo)] hover:-translate-y-1", active ? "border-forest shadow-[var(--shadow-lift)]" : "border-transparent shadow-[var(--shadow-card)]")}
                      >
                        <span className="relative block aspect-[16/10] w-full overflow-hidden bg-forest">
                          <Image src={b.image} alt="" fill sizes="(min-width: 768px) 300px, 100vw" className="object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
                          <span className="absolute left-3 top-3 rounded-full bg-cream/95 px-3 py-1 text-[0.66rem] font-bold uppercase tracking-wider text-forest">{b.serves}</span>
                          {active && (
                            <span className="pop absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-gold text-forest">
                              <Icon name="check" className="h-4 w-4" />
                            </span>
                          )}
                        </span>
                        <span className="flex flex-1 flex-col p-5">
                          <span className="display text-2xl text-forest">{b.name}</span>
                          <span className="mt-1 text-sm text-charcoal/75">{bundleContents(b)}</span>
                          <span className="mt-4 flex items-end justify-between gap-2">
                            <span className="text-xl font-bold tabular-nums text-forest">{formatPrice(b.pricePence)}</span>
                            {b.saveUpToPence > 0 && <span className="text-xs font-semibold text-charcoal/70">Save up to {formatPrice(b.saveUpToPence)}</span>}
                          </span>
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {step === 1 && bundle && picker(mains, mainsHave, mainsNeed, "main")}
          {step === 2 && bundle && picker(sides, sidesHave, sidesNeed, "side")}

          {step === 3 && bundle && (
            <div>
              <h2 className="display text-3xl text-forest md:text-4xl">Review your {bundle.name}</h2>
              <p className="mt-1.5 text-sm text-charcoal/75">Check everything looks right, then add the bundle to your basket.</p>
              <ul className="mt-6 divide-y divide-forest/10 rounded-3xl bg-white px-5 shadow-[var(--shadow-card)]">
                {chosen.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 py-4">
                    <span className="relative h-16 w-16 flex-none overflow-hidden rounded-xl bg-forest">
                      <Image src={p.image} alt="" fill sizes="64px" className="object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-forest">{p.name}</span>
                      <span className="text-xs text-charcoal/65">{MAIN_CATEGORIES.includes(p.category) ? "Main" : "Side"} · {p.variants[0]?.label}</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-forest">× {picks[p.id]}</span>
                    <span className="w-16 text-right text-sm tabular-nums text-charcoal/65">{formatPrice(p.pricePence * picks[p.id])}</span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setStep(1)} className="mt-4 text-sm font-semibold text-forest underline underline-offset-4">
                Change my selection
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        <aside aria-label="Bundle summary" className="on-dark hidden h-fit rounded-3xl bg-forest p-6 text-cream lg:sticky lg:top-24 lg:block">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow text-gold">Your bundle</p>
            <RangeBadge range={range} size="sm" />
          </div>
          <p className="display mt-3 text-3xl">{bundle?.name ?? "Not chosen yet"}</p>
          {bundle && (
            <div className="mt-6 space-y-5">
              <Meter label="Mains" have={mainsHave} need={mainsNeed} />
              <Meter label="Sides" have={sidesHave} need={sidesNeed} />
            </div>
          )}
          {chosen.length > 0 && (
            <ul className="mt-6 space-y-1.5 border-t border-cream/15 pt-5 text-sm text-cream/85">
              {chosen.map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span className="truncate">{p.name}</span>
                  <span className="tabular-nums text-cream/65">× {picks[p.id]}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 flex items-start gap-2 text-sm text-cream/80" aria-live="polite">
            <Icon name={complete ? "check" : "info"} className="mt-0.5 h-4 w-4 flex-none text-gold" /> {remaining}
          </p>
          {bundle && (
            <dl className="mt-5 space-y-1.5 border-t border-cream/15 pt-5 text-sm">
              {chosen.length > 0 && (
                <div className="flex justify-between text-cream/70">
                  <dt>Bought separately{complete ? "" : " (so far)"}</dt>
                  <dd className="tabular-nums">{formatPrice(separately)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <dt className="font-semibold">Bundle price</dt>
                <dd className="text-2xl font-bold tabular-nums">{formatPrice(bundle.pricePence)}</dd>
              </div>
              {saving > 0 && (
                <div key={saving} className="pop flex justify-between rounded-xl bg-gold px-3 py-2 font-bold text-forest">
                  <dt>You save</dt>
                  <dd className="tabular-nums">{formatPrice(saving)}</dd>
                </div>
              )}
            </dl>
          )}
          {step < 3 ? (
            <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className={btn("gold", "md", "mt-6 w-full")}>
              Continue to {STEPS[step + 1].toLowerCase()} <Icon name="arrow-right" className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" disabled={!complete} onClick={add} className={btn("gold", "md", "mt-6 w-full")}>
              Add bundle to basket
            </button>
          )}
        </aside>
      </div>

      {/* Mobile action bar */}
      <div className="on-dark fixed inset-x-0 bottom-0 z-30 border-t border-gold/30 bg-forest p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-cream lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {bundle ? `${bundle.name} · ${formatPrice(bundle.pricePence)}` : "Choose a bundle"}
              {saving > 0 && <span className="ml-2 text-gold">Save {formatPrice(saving)}</span>}
            </p>
            <p className="truncate text-xs text-cream/75" aria-live="polite">
              {bundle ? `${mainsHave}/${mainsNeed} mains · ${sidesHave}/${sidesNeed} sides · ${remaining}` : remaining}
            </p>
          </div>
          {step < 3 ? (
            <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className={btn("gold", "md", "flex-none")}>
              Next <Icon name="arrow-right" className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" disabled={!complete} onClick={add} className={btn("gold", "md", "flex-none")}>
              Add to basket
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
