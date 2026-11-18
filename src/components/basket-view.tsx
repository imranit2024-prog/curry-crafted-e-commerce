"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { formatPrice, type Quote } from "@/lib/types";
import { EmptyBasket, GroupHeader, LineItem } from "./cart-drawer";
import { useStore } from "./store";
import { Icon, Notice, btn, cx, inputClass } from "./ui";

export function OrderTotals({ quote, className }: { quote: Quote; className?: string }) {
  return (
    <dl className={cx("space-y-2 text-sm", className)}>
      <div className="flex justify-between text-charcoal/85">
        <dt>Subtotal</dt>
        <dd className="tabular-nums">{formatPrice(quote.subtotalPence)}</dd>
      </div>
      {quote.promo?.valid && (
        <div className="flex justify-between font-medium text-forest">
          <dt>Promo code {quote.promo.code}</dt>
          <dd className="tabular-nums">-{formatPrice(quote.discountPence)}</dd>
        </div>
      )}
      {quote.rewardDiscountPence > 0 && (
        <div className="flex justify-between font-medium text-forest">
          <dt>Rewards ({quote.rewards.applied} points)</dt>
          <dd className="tabular-nums">-{formatPrice(quote.rewardDiscountPence)}</dd>
        </div>
      )}
      {quote.chilled && (
        <div className="flex justify-between text-charcoal/85">
          <dt>Chilled delivery</dt>
          <dd className="tabular-nums">{quote.chilled.status !== "ok" ? "To be confirmed" : quote.chilled.deliveryPence === 0 ? "Free" : formatPrice(quote.chilled.deliveryPence)}</dd>
        </div>
      )}
      {quote.frozen && (
        <div className="flex justify-between text-charcoal/85">
          <dt>
            Frozen delivery
            {quote.frozen.surchargePence > 0 && <span className="block text-xs text-charcoal/60">includes {formatPrice(quote.frozen.surchargePence)} remote-area surcharge</span>}
          </dt>
          <dd className="tabular-nums">{quote.frozen.status !== "ok" ? "Unavailable" : quote.frozen.deliveryPence === 0 ? "Free" : formatPrice(quote.frozen.deliveryPence)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between border-t border-forest/15 pt-3 text-forest">
        <dt className="text-base font-bold">Total</dt>
        <dd className="text-2xl font-bold tabular-nums">{formatPrice(quote.totalPence)}</dd>
      </div>
    </dl>
  );
}

function PromoField() {
  const { promoCode, setPromoCode, quote, quoteLoading } = useStore();
  const [draft, setDraft] = useState(promoCode);
  useEffect(() => setDraft(promoCode), [promoCode]);
  const applied = quote?.promo ?? null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setPromoCode(draft.trim().toUpperCase());
  };

  return (
    <div>
      <form onSubmit={submit} className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="promo" className="mb-1.5 block text-sm font-semibold text-forest">
            Promotional code
          </label>
          <input id="promo" value={draft} onChange={(e) => setDraft(e.target.value.toUpperCase())} placeholder="Enter code" autoComplete="off" maxLength={40} className={cx(inputClass, "uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal")} aria-describedby="promo-status" />
        </div>
        <button type="submit" disabled={!draft.trim() || quoteLoading} className={btn("outline", "md", "mt-[1.65rem]")}>
          Apply
        </button>
      </form>
      <div id="promo-status" aria-live="polite" className="mt-2 text-sm">
        {applied?.valid && (
          <p className="flex items-center justify-between gap-2 rounded-xl bg-sage px-3 py-2 font-medium text-forest">
            <span className="flex items-center gap-2">
              <Icon name="check" className="h-4 w-4" /> {applied.code}: {applied.message}
            </span>
            <button type="button" onClick={() => setPromoCode("")} className="text-xs font-semibold underline underline-offset-4">
              Remove
            </button>
          </p>
        )}
        {applied && !applied.valid && (
          <p role="alert" className="flex items-start gap-2 font-medium text-danger">
            <Icon name="alert" className="mt-0.5 h-4 w-4 flex-none" /> {applied.message}
          </p>
        )}
        {!applied && <p className="text-xs text-charcoal/60">Preview code: WELCOME10 (placeholder offer).</p>}
      </div>
    </div>
  );
}

function RewardField() {
  const { quote, redeemPoints, setRedeemPoints, user } = useStore();
  if (!quote) return null;
  const r = quote.rewards;
  const step = Math.max(1, Math.round(50 / r.pointValuePence));

  if (!user) {
    return (
      <div className="rounded-2xl bg-sage p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold text-forest">
          <Icon name="gift" className="h-4 w-4" /> Rewards
        </p>
        <p className="mt-1 text-charcoal/80">
          <Link href="/login?next=/basket" className="font-semibold text-forest underline underline-offset-4">
            Sign in
          </Link>{" "}
          to redeem points, or{" "}
          <Link href="/register?next=/basket" className="font-semibold text-forest underline underline-offset-4">
            join free
          </Link>{" "}
          to earn {quote.pointsToEarn} points on this order.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-sage p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold text-forest">
          <Icon name="gift" className="h-4 w-4" /> Redeem rewards
        </p>
        <span className="font-semibold tabular-nums text-forest">{r.balance} points</span>
      </div>
      {r.maxRedeemable === 0 ? (
        <p className="mt-2 text-charcoal/80">
          {r.balance < r.minRedeemPoints ? `You need at least ${r.minRedeemPoints} points to redeem. You'll earn ${quote.pointsToEarn} on this order.` : "Rewards can't be applied to this basket yet. Add a little more to your order."}
        </p>
      ) : (
        <>
          <label htmlFor="redeem" className="mt-3 flex items-center justify-between text-charcoal/85">
            <span>Use points</span>
            <span className="font-bold tabular-nums text-forest" aria-live="polite">
              {r.applied} points = -{formatPrice(r.discountPence)}
            </span>
          </label>
          <input
            id="redeem"
            type="range"
            min={0}
            max={r.maxRedeemable}
            step={step}
            value={Math.min(redeemPoints, r.maxRedeemable)}
            onChange={(e) => {
              const v = Number(e.target.value);
              setRedeemPoints(v > 0 && v < r.minRedeemPoints ? r.minRedeemPoints : v);
            }}
            className="mt-2 h-6 w-full accent-[#0F2418]"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-charcoal/65">
            <button type="button" onClick={() => setRedeemPoints(0)} className="font-semibold text-forest underline underline-offset-4">
              Use none
            </button>
            <span>Minimum {r.minRedeemPoints} points</span>
            <button type="button" onClick={() => setRedeemPoints(r.maxRedeemable)} className="font-semibold text-forest underline underline-offset-4">
              Use maximum
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function BasketView() {
  const { hydrated, lines, quote, quoteLoading, quoteError, postcode, requestPostcode, user } = useStore();

  if (!hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]" aria-busy="true">
        <div className="space-y-4">
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
        </div>
        <div className="skeleton h-80" />
      </div>
    );
  }
  if (lines.length === 0) {
    return (
      <div className="rounded-[2rem] bg-white shadow-[var(--shadow-card)]">
        <EmptyBasket />
      </div>
    );
  }

  const unavailable = quote?.lines.filter((l) => !l.purchasable) ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:gap-12">
      <div className={cx("space-y-8 transition-opacity", quoteLoading && quote && "opacity-70")}>
        {quoteError && <Notice tone="error" title="We couldn't update your basket">{quoteError}</Notice>}

        {!quote ? (
          <div className="space-y-4" aria-busy="true">
            <div className="skeleton h-28" />
            <div className="skeleton h-28" />
          </div>
        ) : (
          <>
            {unavailable.length > 0 && (
              <section aria-labelledby="unavailable-heading" className="rounded-3xl border border-danger/25 bg-white p-5 md:p-6">
                <h2 id="unavailable-heading" className="flex items-center gap-2 font-semibold text-danger">
                  <Icon name="alert" className="h-5 w-5" /> Unavailable items
                </h2>
                <p className="mt-1 text-sm text-charcoal/75">These can&apos;t be ordered right now. Remove them to continue to checkout.</p>
                <ul className="divide-y divide-forest/10">
                  {unavailable.map((l) => (
                    <LineItem key={l.key} line={l} />
                  ))}
                </ul>
              </section>
            )}

            {(["chilled", "frozen"] as const).map((range) => {
              const group = quote[range];
              const mine = quote.lines.filter((l) => l.range === range && l.purchasable);
              if (!group || !mine.length) return null;
              return (
                <section key={range} aria-label={range === "chilled" ? "Chilled meals" : "Frozen meals"} className="rounded-3xl bg-white p-5 shadow-[var(--shadow-card)] md:p-6">
                  <GroupHeader group={group} />
                  <ul className="divide-y divide-forest/10">
                    {mine.map((l) => (
                      <LineItem key={l.key} line={l} />
                    ))}
                  </ul>
                </section>
              );
            })}

            {quote.chilled && quote.frozen && (
              <Notice title="Your chilled and frozen meals are delivered separately">
                Chilled meals arrive in our refrigerated delivery service on the day and slot you choose. Frozen meals are sent by tracked courier and may arrive on a different day. Each range has its own minimum order and delivery charge.
              </Notice>
            )}
          </>
        )}

        <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-forest underline underline-offset-4">
          <Icon name="chevron-left" className="h-4 w-4" /> Continue shopping
        </Link>
      </div>

      <aside aria-label="Order summary" className="h-fit space-y-5 rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
        <h2 className="display text-3xl text-forest">Order summary</h2>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-forest/10 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-charcoal/85">
            <Icon name="pin" className="h-4 w-4 text-forest" />
            {postcode ? (
              <>
                Delivering to <strong className="text-forest">{postcode.postcode}</strong>
              </>
            ) : (
              "No postcode checked yet"
            )}
          </span>
          <button type="button" onClick={() => requestPostcode()} className="font-semibold text-forest underline underline-offset-4">
            {postcode ? "Change" : "Check"}
          </button>
        </div>

        <PromoField />
        <RewardField />

        {quote ? <OrderTotals quote={quote} /> : <div className="skeleton h-32" />}

        {quote && user && quote.pointsToEarn > 0 && (
          <p className="flex items-center gap-2 text-xs font-medium text-charcoal/75">
            <Icon name="star" className="h-4 w-4 text-forest" /> You&apos;ll earn {quote.pointsToEarn} reward points on this order.
          </p>
        )}

        {quote && quote.blockers.length > 0 && (
          <ul role="alert" className="space-y-2 rounded-2xl bg-danger-soft p-4 text-sm font-medium text-danger">
            {quote.blockers.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Icon name="alert" className="mt-0.5 h-4 w-4 flex-none" /> {b}
              </li>
            ))}
          </ul>
        )}

        {quote?.canCheckout && !quoteLoading ? (
          <Link href="/checkout" className={btn("primary", "lg", "w-full")}>
            <Icon name="lock" className="h-4 w-4" /> Proceed to checkout
          </Link>
        ) : (
          <button type="button" disabled className={btn("primary", "lg", "w-full")}>
            {quoteLoading ? <span className="spinner" /> : <Icon name="lock" className="h-4 w-4" />} Proceed to checkout
          </button>
        )}
        <p className="text-center text-xs text-charcoal/60">Delivery days are chosen at checkout. Prices are confirmed again before you pay.</p>
      </aside>
    </div>
  );
}
