import type { Metadata } from "next";
import Link from "next/link";
import { CollectionBanner, InfoCard } from "@/components/blocks";
import { Catalogue } from "@/components/catalogue";
import { SampleNote } from "@/components/ui";
import { getProducts } from "@/lib/catalog";
import { getConfig } from "@/lib/config";
import { formatPriceShort, hourLabel, listWeekdays } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Frozen collection", description: "Frozen curries, rice and sides delivered UK-wide by tracked courier." };

export default async function FrozenPage() {
  const [products, config] = await Promise.all([getProducts(), getConfig()]);
  const { frozenSchedule: f, delivery } = config;
  const transit = f.transitDaysMin === f.transitDaysMax ? `${f.transitDaysMin}` : `${f.transitDaysMin}–${f.transitDaysMax}`;
  return (
    <>
      <CollectionBanner
        range="frozen"
        image="/images/collection-frozen.jpg"
        crumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: "Frozen" }]}
        title={<>The Frozen <em className="text-gold">Collection.</em></>}
        intro="The same recipes, frozen within hours of cooking to lock in flavour. Stock your freezer and a proper curry is never more than a few minutes away."
        points={[
          { icon: "truck", text: "Delivered UK-wide by tracked courier, packed with ice in insulated boxes." },
          { icon: "box", text: `Dispatched ${listWeekdays(f.dispatchWeekdays)}. Usually arrives ${transit} working day${f.transitDaysMax === 1 ? "" : "s"} later.` },
          { icon: "pin", text: "No chilled postcode check needed. A few remote postcodes carry a surcharge." },
        ]}
      />

      <section className="container-x py-12 md:py-16" aria-label="Frozen products">
        <Catalogue products={products} lockedRange="frozen" />
      </section>

      <section className="bg-cream-dark/60 py-16 md:py-20" aria-labelledby="frozen-info">
        <div className="container-x">
          <h2 id="frozen-info" className="display text-3xl text-forest md:text-4xl">Storing, cooking and delivery</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <InfoCard icon="snowflake" title="Storage information">
              <p>Put your meals straight into the freezer when they arrive and keep at -18°C or below.</p>
              <p>If a meal has defrosted, keep it in the fridge, eat within 24 hours and don&apos;t refreeze.</p>
            </InfoCard>
            <InfoCard icon="flame" title="Preparation instructions">
              <p>Cook from frozen. Mains take 8–9 minutes in the microwave or 35–40 minutes in the oven; breads and samosas crisp up in the oven in 10–12 minutes.</p>
              <p>Dish-specific instructions are on every product page.</p>
            </InfoCard>
            <InfoCard icon="truck" title="Delivery information">
              <p>
                Minimum order {formatPriceShort(delivery.frozen.minOrderPence)}. Delivery {formatPriceShort(delivery.frozen.chargePence)}
                {delivery.frozen.freeOverPence !== null && `, free over ${formatPriceShort(delivery.frozen.freeOverPence)}`}.
              </p>
              <p>Order by {hourLabel(f.cutoffHour)} on a dispatch day to catch that day&apos;s courier.</p>
              <p><Link href="/delivery" className="font-semibold text-forest underline underline-offset-4">Read delivery information</Link></p>
            </InfoCard>
          </div>
          <SampleNote className="mt-6 max-w-2xl" />
        </div>
      </section>
    </>
  );
}
