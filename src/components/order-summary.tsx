import Image from "next/image";
import type { OrderItemRow, OrderRow } from "@/lib/orders";
import { formatPrice, type Range } from "@/lib/types";
import { Icon, RangeBadge } from "./ui";

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function OrderDelivery({ order, items }: { order: OrderRow; items: OrderItemRow[] }) {
  const hasChilled = items.some((i) => i.range === "chilled");
  const hasFrozen = items.some((i) => i.range === "frozen");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-forest/10 bg-white p-5 text-sm">
        <p className="flex items-center gap-2 font-semibold text-forest">
          <Icon name="pin" className="h-4 w-4" /> Delivery address
        </p>
        <p className="mt-2 leading-relaxed text-charcoal/85">
          {order.name}
          <br />
          {order.address.line1}
          {order.address.line2 && (
            <>
              <br />
              {order.address.line2}
            </>
          )}
          <br />
          {order.address.city}, {order.address.postcode}
        </p>
      </div>
      <div className="space-y-4">
        {hasChilled && (
          <div className="rounded-2xl border border-forest/10 bg-white p-5 text-sm">
            <RangeBadge range="chilled" size="sm" />
            <p className="mt-2.5 font-semibold text-forest">{order.chilledSlotLabel ?? "Delivery slot to be confirmed"}</p>
            <p className="mt-1 text-charcoal/75">Delivered by our refrigerated service.</p>
          </div>
        )}
        {hasFrozen && (
          <div className="rounded-2xl border border-forest/10 bg-white p-5 text-sm">
            <RangeBadge range="frozen" size="sm" />
            <p className="mt-2.5 font-semibold text-forest">{order.frozenEstimate ?? "Dispatch date to be confirmed"}</p>
            <p className="mt-1 text-charcoal/75">Sent separately by tracked courier.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function OrderItems({ order, items }: { order: OrderRow; items: OrderItemRow[] }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-[var(--shadow-card)] md:p-7">
      <ul className="divide-y divide-forest/10">
        {items.map((item) => (
          <li key={item.id} className="flex gap-4 py-4 first:pt-0">
            <span className="relative h-16 w-16 flex-none overflow-hidden rounded-xl bg-forest">{item.image && <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />}</span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-forest">
                {item.quantity} × {item.name}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-charcoal/65">
                <RangeBadge range={item.range as Range} size="sm" />
                {item.variantLabel}
                <span className="tabular-nums">{formatPrice(item.unitPricePence)} each</span>
              </p>
              {item.contents && item.contents.length > 0 && <p className="mt-1.5 text-xs leading-relaxed text-charcoal/70">{item.contents.map((c) => `${c.qty} × ${c.name}`).join(" · ")}</p>}
            </div>
            <p className="text-sm font-semibold tabular-nums text-forest">{formatPrice(item.lineTotalPence)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-2 border-t border-forest/15 pt-5 text-sm">
        <div className="flex justify-between text-charcoal/85">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatPrice(order.subtotalPence)}</dd>
        </div>
        {order.discountPence > 0 && (
          <div className="flex justify-between font-medium text-forest">
            <dt>Promo code {order.promoCode}</dt>
            <dd className="tabular-nums">-{formatPrice(order.discountPence)}</dd>
          </div>
        )}
        {order.rewardDiscountPence > 0 && (
          <div className="flex justify-between font-medium text-forest">
            <dt>Rewards ({order.rewardPointsRedeemed} points)</dt>
            <dd className="tabular-nums">-{formatPrice(order.rewardDiscountPence)}</dd>
          </div>
        )}
        {items.some((i) => i.range === "chilled") && (
          <div className="flex justify-between text-charcoal/85">
            <dt>Chilled delivery</dt>
            <dd className="tabular-nums">{order.chilledDeliveryPence === 0 ? "Free" : formatPrice(order.chilledDeliveryPence)}</dd>
          </div>
        )}
        {items.some((i) => i.range === "frozen") && (
          <div className="flex justify-between text-charcoal/85">
            <dt>Frozen delivery</dt>
            <dd className="tabular-nums">{order.frozenDeliveryPence === 0 ? "Free" : formatPrice(order.frozenDeliveryPence)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-forest/15 pt-3 text-forest">
          <dt className="text-base font-bold">Total paid</dt>
          <dd className="text-2xl font-bold tabular-nums">{formatPrice(order.totalPence)}</dd>
        </div>
      </dl>
    </div>
  );
}
