import type { Metadata } from "next";
import Link from "next/link";
import { OrderCard } from "@/components/order-card";
import { btn } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  await requireUser();
  const orders = await getOrdersForUser();
  return (
    <div>
      <h1 className="display text-4xl text-forest">My Orders</h1>
      <p className="mt-2 text-sm text-charcoal/75">{orders.length ? `${orders.length} order${orders.length === 1 ? "" : "s"} placed with this account.` : "Orders you place while signed in will appear here."}</p>
      <div className="mt-8 space-y-5">
        {orders.map(({ order, items }) => <OrderCard key={order.id} order={order} items={items} />)}
        {orders.length === 0 && (
          <div className="rounded-3xl border border-dashed border-forest/20 bg-white p-10 text-center">
            <p className="display text-2xl text-forest">No orders yet</p>
            <Link href="/shop" className={btn("primary", "md", "mt-5")}>Browse the menu</Link>
          </div>
        )}
      </div>
    </div>
  );
}
