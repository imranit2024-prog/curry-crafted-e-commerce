import type { Metadata } from "next";
import { BasketView } from "@/components/basket-view";
import { Breadcrumbs } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your basket" };

export default function BasketPage() {
  return (
    <section className="container-x py-8 md:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Basket" }]} />
      <h1 className="display mt-6 text-[clamp(2.4rem,5vw,4rem)] text-forest">Your Basket</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-charcoal/75">Chilled and frozen meals are grouped separately because each range has its own delivery arrangements, minimum order and charges.</p>
      <div className="mt-8 md:mt-10">
        <BasketView />
      </div>
    </section>
  );
}
