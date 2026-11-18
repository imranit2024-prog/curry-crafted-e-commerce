import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/checkout-flow";
import { getCurrentUser } from "@/lib/auth";
import { getConfig, stripeConfigured } from "@/lib/config";
import { getAddresses } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Secure checkout" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const sp = await searchParams;
  const [user, config, stripeEnabled] = await Promise.all([getCurrentUser(), getConfig(), stripeConfigured()]);
  const savedAddresses = user ? await getAddresses() : [];
  return (
    <section className="container-x py-8 md:py-12">
      <h1 className="display text-[clamp(2.2rem,4.5vw,3.5rem)] text-forest">Checkout</h1>
      <div className="mt-8">
        <CheckoutFlow stripeEnabled={stripeEnabled} guestCheckout={config.guestCheckout} paymentCancelled={sp.payment === "cancelled"} savedAddresses={savedAddresses} />
      </div>
    </section>
  );
}
