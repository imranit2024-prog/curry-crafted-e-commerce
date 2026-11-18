import Link from "next/link";
import { ReorderButton } from "./account-ui";
import { formatDateTime } from "./order-summary";
import { Icon, btn } from "./ui";
import { ORDER_STATUS_LABELS, type OrderItemRow, type OrderRow } from "@/lib/orders";
import { formatPrice } from "@/lib/types";

export function OrderCard({ order, items }: { order: OrderRow; items: OrderItemRow[] }) {
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const hasChilled = items.some((i) => i.range === "chilled");
  const hasFrozen = items.some((i) => i.range === "frozen");
  return (
    <article className="rounded-3xl bg-white p-5 shadow-[var(--shadow-card)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/60">Order reference</p>
          <h3 className="mt-0.5 text-lg font-bold tracking-wider text-forest">{order.reference}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-forest px-3 py-1.5 text-[0.66rem] font-bold uppercase tracking-wider text-gold">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
          <span className="rounded-full bg-sage px-3 py-1.5 text-[0.66rem] font-bold uppercase tracking-wider text-forest">{order.paymentStatus === "paid" ? (order.paymentMode === "demo" ? "Paid (demo)" : "Paid") : order.paymentStatus}</span>
        </div>
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-charcoal/60">Order date</dt>
          <dd className="mt-0.5 font-medium text-charcoal">{formatDateTime(order.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-charcoal/60">Products</dt>
          <dd className="mt-0.5 font-medium text-charcoal">{count} item{count === 1 ? "" : "s"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-charcoal/60">Order total</dt>
          <dd className="mt-0.5 font-bold tabular-nums text-forest">{formatPrice(order.totalPence)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-charcoal/60">Delivery</dt>
          <dd className="mt-0.5 space-y-1 font-medium text-charcoal">
            {hasChilled && <span className="flex items-start gap-1.5"><Icon name="drop" className="mt-0.5 h-3.5 w-3.5 flex-none text-forest" />{order.chilledSlotLabel}</span>}
            {hasFrozen && <span className="flex items-start gap-1.5"><Icon name="snowflake" className="mt-0.5 h-3.5 w-3.5 flex-none text-forest" />{order.frozenEstimate}</span>}
          </dd>
        </div>
      </dl>
      <p className="mt-4 truncate text-sm text-charcoal/70">{items.map((i) => `${i.quantity} × ${i.name}`).join(" · ")}</p>
      <div className="mt-5 flex flex-wrap gap-3 border-t border-forest/10 pt-5">
        <Link href={`/account/orders/${order.reference}`} className={btn("outline", "sm")}>View order details</Link>
        <ReorderButton reference={order.reference} />
      </div>
    </article>
  );
}
