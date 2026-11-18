import type { Metadata } from "next";
import Link from "next/link";
import { ReorderButton } from "@/components/account-ui";
import { OrderCard } from "@/components/order-card";
import { Icon, btn } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { getAddresses, getOrdersForUser, getRewardSummary } from "@/lib/orders";
import { formatPrice } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My account" };

export default async function AccountOverview() {
  await requireUser();
  const [orders, rewards, saved, config] = await Promise.all([getOrdersForUser(), getRewardSummary(), getAddresses(), getConfig()]);
  const recent = orders[0];
  const qualified = rewards.referrals.filter((r) => r.referral.status === "qualified").length;
  const defaultAddress = saved.find((a) => a.isDefault) ?? saved[0];

  return (
    <div className="space-y-8">
      <h1 className="display text-4xl text-forest">Overview</h1>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="on-dark rounded-3xl bg-forest p-6 text-cream">
          <p className="eyebrow text-gold">Reward balance</p>
          <p className="display mt-3 text-5xl">{rewards.balance}</p>
          <p className="mt-1 text-sm text-cream/75">points · worth {formatPrice(rewards.balance * config.rewards.pointValuePence)}</p>
          <Link href="/account/rewards" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold underline-offset-4 hover:underline">View rewards <Icon name="arrow-right" className="h-4 w-4" /></Link>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-[var(--shadow-card)]">
          <p className="eyebrow text-forest/65">Referrals</p>
          <p className="display mt-3 text-5xl text-forest">{rewards.referrals.length}</p>
          <p className="mt-1 text-sm text-charcoal/75">friend{rewards.referrals.length === 1 ? "" : "s"} joined · {qualified} qualified</p>
          <Link href="/account/refer" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-forest underline-offset-4 hover:underline">Refer a friend <Icon name="arrow-right" className="h-4 w-4" /></Link>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-[var(--shadow-card)]">
          <p className="eyebrow text-forest/65">Saved addresses</p>
          {defaultAddress ? (
            <p className="mt-3 text-sm leading-relaxed text-charcoal/85">
              <strong className="text-forest">{defaultAddress.label}</strong><br />{defaultAddress.line1}, {defaultAddress.city}<br />{defaultAddress.postcode}
              {saved.length > 1 && <span className="mt-1 block text-charcoal/60">+{saved.length - 1} more</span>}
            </p>
          ) : (
            <p className="mt-3 text-sm text-charcoal/75">No addresses saved yet.</p>
          )}
          <Link href="/account/addresses" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-forest underline-offset-4 hover:underline">Manage addresses <Icon name="arrow-right" className="h-4 w-4" /></Link>
        </div>
      </div>

      <section aria-labelledby="recent-order">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="recent-order" className="display text-3xl text-forest">Most recent order</h2>
          {orders.length > 1 && <Link href="/account/orders" className="text-sm font-semibold text-forest underline underline-offset-4">View all {orders.length} orders</Link>}
        </div>
        {recent ? (
          <>
            <OrderCard order={recent.order} items={recent.items} />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-sage p-6">
              <div>
                <p className="display text-2xl text-forest">Fancy the same again?</p>
                <p className="mt-1 text-sm text-charcoal/75">We&apos;ll check today&apos;s availability, prices and delivery before adding anything to your basket.</p>
              </div>
              <ReorderButton reference={recent.order.reference} size="md" label="Quick reorder" />
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-forest/20 bg-white p-10 text-center">
            <p className="display text-2xl text-forest">No orders yet</p>
            <p className="mt-2 text-sm text-charcoal/75">Your first order will appear here, ready to reorder in a tap.</p>
            <Link href="/shop" className={btn("primary", "md", "mt-5")}>Start shopping</Link>
          </div>
        )}
      </section>
    </div>
  );
}
