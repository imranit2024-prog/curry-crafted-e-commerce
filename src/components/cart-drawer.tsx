"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice, type GroupSummary, type QuoteLine } from "@/lib/types";
import { QuantitySelector, useDialog } from "./client-ui";
import { useStore } from "./store";
import { Icon, RangeBadge, btn, cx } from "./ui";

export function LineItem({ line, compact = false, onNavigate }: { line: QuoteLine; compact?: boolean; onNavigate?: () => void }) {
  const { setQty, removeLine } = useStore();
  const href = line.type === "product" && line.slug ? `/products/${line.slug}` : line.type === "bundle" ? "/bundles" : null;
  const problem = !line.purchasable || !line.eligible;
  return (
    <li className={cx("flex gap-4 py-4", compact ? "" : "sm:gap-5 sm:py-5")}>
      <div className={cx("relative flex-none overflow-hidden rounded-xl bg-forest", compact ? "h-20 w-20" : "h-24 w-24 sm:h-28 sm:w-28", !line.purchasable && "opacity-50 grayscale")}>
        {line.image ? <Image src={line.image} alt="" fill sizes="112px" className="object-cover" /> : <span className="grid h-full w-full place-items-center text-cream/40"><Icon name="box" /></span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {href ? (
              <Link href={href} onClick={onNavigate} className="font-semibold leading-snug text-forest underline-offset-4 hover:underline">
                {line.name}
              </Link>
            ) : (
              <p className="font-semibold leading-snug text-forest">{line.name}</p>
            )}
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-charcoal/70">
              <RangeBadge range={line.range} size="sm" />
              {line.variantLabel && <span>{line.variantLabel}</span>}
              {!compact && <span className="tabular-nums">{formatPrice(line.unitPricePence)} each</span>}
            </p>
          </div>
          <p className="flex-none font-semibold tabular-nums text-forest">{formatPrice(line.lineTotalPence)}</p>
        </div>

        {line.contents && line.contents.length > 0 && (
          <ul className="mt-2 text-xs leading-relaxed text-charcoal/70">
            {line.contents.map((c) => (
              <li key={c.productId}>
                {c.qty} × {c.name}
              </li>
            ))}
          </ul>
        )}

        {line.issue && (
          <p role={problem ? "alert" : undefined} className={cx("mt-2 flex items-start gap-1.5 text-xs font-medium", problem ? "text-danger" : "text-charcoal/70")}>
            <Icon name={problem ? "alert" : "info"} className="mt-px h-3.5 w-3.5 flex-none" />
            {line.issue}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          {line.purchasable ? (
            <QuantitySelector size="sm" value={line.qty} max={line.maxQty} onChange={(q) => setQty(line.key, q)} label={`Quantity of ${line.name}`} />
          ) : (
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal/60">Unavailable</span>
          )}
          <button type="button" onClick={() => removeLine(line.key)} className="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-charcoal/70 transition-colors hover:bg-danger-soft hover:text-danger" aria-label={`Remove ${line.name}`}>
            <Icon name="trash" className="h-4 w-4" /> Remove
          </button>
        </div>
      </div>
    </li>
  );
}

export function GroupHeader({ group, compact = false }: { group: GroupSummary; compact?: boolean }) {
  const { requestPostcode } = useStore();
  const title = group.range === "chilled" ? "Chilled Meals" : "Frozen Meals";
  const bad = group.status !== "ok";
  const pct = Math.min(100, Math.round((group.subtotalPence / group.minOrderPence) * 100));
  return (
    <div className={cx("rounded-2xl border p-4", bad ? "border-danger/25 bg-danger-soft" : "border-forest/10 bg-sage")}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-forest">
          <Icon name={group.range === "chilled" ? "drop" : "snowflake"} className="h-4 w-4" />
          {title}
          <span className="text-xs font-medium text-charcoal/60">
            · {group.itemCount} item{group.itemCount === 1 ? "" : "s"}
          </span>
        </h3>
        <span className="text-sm font-semibold tabular-nums text-forest">{formatPrice(group.subtotalPence)}</span>
      </div>
      <p className={cx("mt-2 text-xs leading-relaxed", bad ? "font-medium text-danger" : "text-charcoal/75")}>{group.message}</p>
      {group.status === "unchecked" && (
        <button type="button" onClick={() => requestPostcode()} className={btn("primary", "sm", "mt-3")}>
          <Icon name="pin" className="h-4 w-4" /> Check postcode
        </button>
      )}
      {group.status === "ineligible" && group.range === "chilled" && (
        <Link href="/frozen" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-forest underline underline-offset-4">
          Browse the frozen range instead <Icon name="arrow-right" className="h-3.5 w-3.5" />
        </Link>
      )}
      {group.status === "ok" && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-forest/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${title} minimum order progress`}>
            <div className={cx("progress-fill h-full rounded-full", pct >= 100 ? "bg-forest" : "bg-gold-muted")} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-charcoal/75">
            {group.remainingToMinPence > 0 ? (
              <>
                Add <strong className="text-forest">{formatPrice(group.remainingToMinPence)}</strong> more to reach the {formatPrice(group.minOrderPence)} minimum for {group.range} orders.
              </>
            ) : group.remainingToFreePence !== null && group.remainingToFreePence > 0 ? (
              <>
                Minimum reached. Add <strong className="text-forest">{formatPrice(group.remainingToFreePence)}</strong> more for free {group.range} delivery.
              </>
            ) : (
              <>Minimum reached{group.deliveryPence === 0 ? " and delivery is free" : ""}.</>
            )}
            {!compact && (
              <span className="ml-1 text-charcoal/60">
                Delivery: {group.deliveryPence === 0 ? "free" : formatPrice(group.deliveryPence)}
                {group.surchargePence > 0 && ` (includes ${formatPrice(group.surchargePence)} remote-area surcharge)`}.
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export function EmptyBasket({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-full bg-sage text-forest">
        <Icon name="bag" className="h-9 w-9" />
      </span>
      <p className="display mt-6 text-3xl text-forest">Your basket is empty</p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-charcoal/70">Fill it with chilled meals for this week, or stock the freezer for whenever you need them.</p>
      <div className="mt-7 flex w-full max-w-xs flex-col gap-3">
        <Link href="/chilled" onClick={onNavigate} className={btn("primary")}>
          Explore chilled meals
        </Link>
        <Link href="/frozen" onClick={onNavigate} className={btn("outline")}>
          Discover the frozen range
        </Link>
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { drawerOpen, setDrawerOpen, quote, quoteLoading, quoteError, lines, count } = useStore();
  const close = () => setDrawerOpen(false);
  const ref = useDialog(drawerOpen, close);
  const hasLines = lines.length > 0;

  return (
    <div className={cx("fixed inset-0 z-[65] overflow-hidden transition-[visibility] duration-500", drawerOpen ? "visible" : "invisible")} aria-hidden={!drawerOpen}>
      <div className={cx("absolute inset-0 bg-forest/70 backdrop-blur-sm transition-opacity duration-500", drawerOpen ? "opacity-100" : "opacity-0")} onClick={close} />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Your basket"
        className={cx(
          "absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-cream shadow-[var(--shadow-lift)] transition-transform duration-500 ease-[var(--ease-expo)]",
          drawerOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="on-dark flex items-center justify-between bg-forest px-5 py-4 text-cream">
          <h2 className="display text-2xl">
            Your basket <span className="font-sans text-sm font-medium text-cream/70">({count})</span>
          </h2>
          <button type="button" onClick={close} aria-label="Close basket" className="grid h-11 w-11 place-items-center rounded-full hover:bg-cream/10">
            <Icon name="close" />
          </button>
        </header>

        {!hasLines ? (
          <EmptyBasket onNavigate={close} />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {quoteError && (
                <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger">
                  {quoteError}
                </p>
              )}
              {!quote ? (
                <div className="space-y-3" aria-busy="true">
                  <div className="skeleton h-24" />
                  <div className="skeleton h-24" />
                </div>
              ) : (
                <div className={cx("space-y-6 transition-opacity", quoteLoading && "opacity-60")}>
                  {(["chilled", "frozen"] as const).map((range) => {
                    const group = quote[range];
                    const mine = quote.lines.filter((l) => l.range === range && l.purchasable);
                    if (!group || !mine.length) return null;
                    return (
                      <section key={range} aria-label={range === "chilled" ? "Chilled meals" : "Frozen meals"}>
                        <GroupHeader group={group} compact />
                        <ul className="divide-y divide-forest/10">
                          {mine.map((l) => (
                            <LineItem key={l.key} line={l} compact onNavigate={close} />
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                  {quote.lines.some((l) => !l.purchasable) && (
                    <section aria-label="Unavailable items">
                      <h3 className="text-sm font-semibold text-danger">Unavailable items</h3>
                      <ul className="divide-y divide-forest/10">
                        {quote.lines
                          .filter((l) => !l.purchasable)
                          .map((l) => (
                            <LineItem key={l.key} line={l} compact onNavigate={close} />
                          ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}
            </div>

            <footer className="border-t border-forest/10 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              {quote && (
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-charcoal/80">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">{formatPrice(quote.subtotalPence)}</dd>
                  </div>
                  <div className="flex justify-between text-charcoal/80">
                    <dt>Delivery</dt>
                    <dd className="tabular-nums">{quote.deliveryPence === 0 ? "Free" : formatPrice(quote.deliveryPence)}</dd>
                  </div>
                  {quote.discountPence + quote.rewardDiscountPence > 0 && (
                    <div className="flex justify-between text-forest">
                      <dt>Discounts</dt>
                      <dd className="tabular-nums">-{formatPrice(quote.discountPence + quote.rewardDiscountPence)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-forest/10 pt-2 text-base font-bold text-forest">
                    <dt>Total</dt>
                    <dd className="tabular-nums">{formatPrice(quote.totalPence)}</dd>
                  </div>
                </dl>
              )}
              {quote && !quote.canCheckout && quote.blockers[0] && (
                <p className="mt-3 flex items-start gap-2 text-xs font-medium leading-relaxed text-danger">
                  <Icon name="alert" className="mt-px h-4 w-4 flex-none" />
                  {quote.blockers[0]}
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link href="/basket" onClick={close} className={btn("outline")}>
                  View basket
                </Link>
                {quote?.canCheckout ? (
                  <Link href="/checkout" onClick={close} className={btn("primary")}>
                    Checkout
                  </Link>
                ) : (
                  <button type="button" disabled className={btn("primary")}>
                    Checkout
                  </button>
                )}
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
