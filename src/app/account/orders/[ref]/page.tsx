import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReorderButton } from "@/components/account-ui";
import { OrderDelivery, OrderItems, formatDateTime } from "@/components/order-summary";
import { Breadcrumbs } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { ORDER_STATUS_LABELS, getOrderForViewer } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order details" };

export default async function OrderDetailPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const user = await requireUser();
  const found = await getOrderForViewer(ref);
  if (found.status !== "ok" || found.order.userId !== user.id) notFound();
  const { order, items } = found;
  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "My Orders", href: "/account/orders" }, { label: order.reference }]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl text-forest">Order {order.reference}</h1>
          <p className="mt-2 text-sm text-charcoal/75">
            Placed {formatDateTime(order.createdAt)} · {ORDER_STATUS_LABELS[order.status] ?? order.status} · {order.paymentStatus === "paid" ? (order.paymentMode === "demo" ? "Paid (demo payment)" : "Paid by card") : "Awaiting payment"}
          </p>
        </div>
        <ReorderButton reference={order.reference} size="md" label="Reorder these items" />
      </div>
      <section aria-labelledby="od-delivery">
        <h2 id="od-delivery" className="display mb-4 text-2xl text-forest">Delivery information</h2>
        <OrderDelivery order={order} items={items} />
      </section>
      <section aria-labelledby="od-items">
        <h2 id="od-items" className="display mb-4 text-2xl text-forest">Purchased products</h2>
        <OrderItems order={order} items={items} />
      </section>
      {order.pointsEarned > 0 && <p className="text-sm text-charcoal/75">You earned <strong className="text-forest">{order.pointsEarned} reward points</strong> on this order.</p>}
      <Link href="/account/orders" className="inline-block text-sm font-semibold text-forest underline underline-offset-4">Back to all orders</Link>
    </div>
  );
}
