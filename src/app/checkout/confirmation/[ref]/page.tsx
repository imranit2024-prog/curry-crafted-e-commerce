import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearBasketOnce } from "@/components/checkout-flow";
import { OrderDelivery, OrderItems, formatDateTime } from "@/components/order-summary";
import { Icon, Notice, btn } from "@/components/ui";
import { getOrderForViewer } from "@/lib/orders";
import { formatPrice } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };

const STEPS = ["Information", "Address", "Schedule", "Review", "Payment", "Confirmation"];

export default async function ConfirmationPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  // The API decides who may see this order and, for customers returning from Stripe,
  // confirms the payment with Stripe before reporting it as paid.
  const found = await getOrderForViewer(ref, { sync: true });
  if (found.status === "missing") notFound();
  if (found.status === "forbidden") {
    return (
      <section className="container-x py-16 text-center">
        <h1 className="display text-4xl text-forest">Sign in to view this order</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-charcoal/75">For your privacy, order details are only shown to the customer who placed the order.</p>
        <Link href={`/login?next=/account/orders/${found.reference}`} className={btn("primary", "md", "mt-6")}>
          Sign in
        </Link>
      </section>
    );
  }
  const { order, items } = found;
  const paid = order.paymentStatus === "paid";

  if (!paid) {
    return (
      <section className="container-x max-w-3xl py-12 md:py-16">
        <Notice tone="error" title="Payment not completed">
          We haven&apos;t received payment for order {order.reference}, so it hasn&apos;t been confirmed and you haven&apos;t been charged. Your basket is still saved.
        </Notice>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/checkout" className={btn("primary", "lg")}>
            Return to checkout
          </Link>
          <Link href="/basket" className={btn("outline", "lg")}>
            View basket
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <ClearBasketOnce reference={order.reference} />
      <section className="on-dark relative overflow-hidden bg-forest text-cream">
        <div className="grain absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container-x relative py-12 md:py-16">
          <ol className="mb-10 hidden grid-cols-6 gap-2 sm:grid" aria-label="Checkout progress">
            {STEPS.map((s, i) => (
              <li key={s} className="text-center text-[0.68rem] font-bold uppercase tracking-wider text-cream/70">
                <span className={`mx-auto mb-1.5 grid h-7 w-7 place-items-center rounded-full ${i === 5 ? "bg-gold text-forest ring-4 ring-gold/30" : "bg-cream/15 text-gold"}`}>
                  <Icon name="check" className="h-3.5 w-3.5" />
                </span>
                {s}
              </li>
            ))}
          </ol>
          <span className="pop grid h-16 w-16 place-items-center rounded-full bg-gold text-forest">
            <Icon name="check" className="h-8 w-8" />
          </span>
          <p className="eyebrow mt-6 text-gold">Step 06 · Order confirmed</p>
          <h1 className="display mt-3 text-[clamp(2.4rem,6vw,4.5rem)]">
            Thank you, <em className="text-gold">{order.name.split(" ")[0]}.</em>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-cream/85 md:text-lg">Your order is confirmed and our kitchen has it. Keep your order reference handy in case you need to get in touch.</p>
          <dl className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gold/30 bg-cream/5 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-cream/65">Order reference</dt>
              <dd className="mt-1 text-xl font-bold tracking-wider text-gold">{order.reference}</dd>
            </div>
            <div className="rounded-2xl border border-cream/15 bg-cream/5 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-cream/65">Payment</dt>
              <dd className="mt-1 font-semibold">
                {formatPrice(order.totalPence)} {order.paymentMode === "demo" ? "· demo payment" : "· paid by card"}
              </dd>
            </div>
            <div className="rounded-2xl border border-cream/15 bg-cream/5 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-cream/65">Placed</dt>
              <dd className="mt-1 font-semibold">{formatDateTime(order.createdAt)}</dd>
            </div>
          </dl>
          {order.paymentMode === "demo" && <p className="mt-4 max-w-2xl text-xs text-cream/65">This order was completed in demo payment mode. No card was charged.</p>}
        </div>
      </section>

      <section className="container-x grid gap-8 py-10 md:py-14 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-8">
          <div>
            <h2 className="display mb-4 text-3xl text-forest">Delivery information</h2>
            <OrderDelivery order={order} items={items} />
            {items.some((i) => i.range === "chilled") && items.some((i) => i.range === "frozen") && (
              <Notice className="mt-4" title="Two separate deliveries">Your chilled and frozen meals are fulfilled separately and may arrive on different days.</Notice>
            )}
          </div>
          <div>
            <h2 className="display mb-4 text-3xl text-forest">Order summary</h2>
            <OrderItems order={order} items={items} />
          </div>
        </div>
        <aside className="h-fit space-y-4 rounded-3xl bg-sage p-6">
          <h2 className="display text-2xl text-forest">What happens next</h2>
          <ul className="space-y-3 text-sm leading-relaxed text-charcoal/85">
            <li className="flex gap-3"><Icon name="mail" className="mt-0.5 h-4 w-4 flex-none text-forest" /> Confirmation emails to {order.email} will be sent once the email service is connected. For now, this page is your receipt.</li>
            <li className="flex gap-3"><Icon name="flame" className="mt-0.5 h-4 w-4 flex-none text-forest" /> We cook your dishes to order ahead of your delivery.</li>
            <li className="flex gap-3"><Icon name="truck" className="mt-0.5 h-4 w-4 flex-none text-forest" /> Your meals arrive as shown under delivery information.</li>
          </ul>
          {order.userId ? (
            <>
              {order.pointsEarned > 0 && (
                <p className="rounded-2xl bg-forest p-4 text-sm font-medium text-cream">
                  <span className="text-gold">+{order.pointsEarned} reward points</span> have been added to your account.
                </p>
              )}
              <Link href={`/account/orders/${order.reference}`} className={btn("primary", "md", "w-full")}>View order in my account</Link>
            </>
          ) : (
            <Link href="/register" className={btn("primary", "md", "w-full")}>Create an account for next time</Link>
          )}
          <Link href="/shop" className={btn("outline", "md", "w-full")}>Continue shopping</Link>
        </aside>
      </section>
    </>
  );
}
