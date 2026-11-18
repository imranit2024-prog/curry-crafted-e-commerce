import type { Metadata } from "next";
import Link from "next/link";
import { CollectionBanner, InfoCard } from "@/components/blocks";
import { Catalogue } from "@/components/catalogue";
import { Reveal } from "@/components/client-ui";
import { PostcodeChecker } from "@/components/postcode";
import { Eyebrow, SampleNote } from "@/components/ui";
import { getProducts } from "@/lib/catalog";
import { getConfig } from "@/lib/config";
import { formatPriceShort, hourLabel, listWeekdays } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Chilled collection", description: "Freshly cooked chilled curries delivered to selected postcodes on the day and time slot you choose." };

export default async function ChilledPage() {
  const [products, config] = await Promise.all([getProducts(), getConfig()]);
  const { chilledSchedule: s, delivery } = config;
  return (
    <>
      <CollectionBanner
        range="chilled"
        image="/images/collection-chilled.jpg"
        crumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: "Chilled" }]}
        title={<>The Chilled <em className="text-gold">Collection.</em></>}
        intro="Cooked in small batches, blast chilled within minutes and delivered in our own refrigerated service. Ready to heat and eat in the days ahead."
        points={[
          { icon: "pin", text: "Delivered to selected postcodes only. Check yours below." },
          { icon: "calendar", text: `Deliveries ${listWeekdays(s.deliveryWeekdays)}, in a time slot you choose.` },
          { icon: "clock", text: `Order by ${hourLabel(s.cutoffHour)}, ${s.cutoffDaysBefore} day${s.cutoffDaysBefore === 1 ? "" : "s"} before delivery.` },
        ]}
      />

      <section className="container-x relative z-10 -mt-8" aria-labelledby="chilled-postcode">
        <Reveal className="grid gap-6 rounded-[2rem] bg-white p-6 shadow-[var(--shadow-lift)] ring-1 ring-gold-muted/30 md:p-9 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Eyebrow>Before you add to basket</Eyebrow>
            <h2 id="chilled-postcode" className="display mt-3 text-3xl text-forest md:text-4xl">Is chilled delivery available for you?</h2>
            <p className="mt-3 text-sm leading-relaxed text-charcoal/75">
              Browse the whole collection freely. We&apos;ll just need to confirm your postcode before chilled dishes can go in your basket. Outside our area?{" "}
              <Link href="/frozen" className="font-semibold text-forest underline underline-offset-4">Our frozen range is delivered UK-wide</Link>.
            </p>
          </div>
          <div className="lg:col-span-8">
            <PostcodeChecker id="chilled-postcode-input" />
          </div>
        </Reveal>
      </section>

      <section className="container-x py-12 md:py-16" aria-label="Chilled products">
        <Catalogue products={products} lockedRange="chilled" />
      </section>

      <section className="bg-cream-dark/60 py-16 md:py-20" aria-labelledby="chilled-info">
        <div className="container-x">
          <h2 id="chilled-info" className="display text-3xl text-forest md:text-4xl">Good to know about chilled</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <InfoCard icon="drop" title="Storage">
              <p>Keep refrigerated at 5°C or below and enjoy by the use-by date on each pack. Most dishes can be frozen at home on the day of delivery.</p>
            </InfoCard>
            <InfoCard icon="flame" title="Preparation">
              <p>Heat in the microwave or on the hob in minutes. Full instructions are on every product page and on the pack.</p>
            </InfoCard>
            <InfoCard icon="truck" title="Delivery">
              <p>
                Minimum order {formatPriceShort(delivery.chilled.minOrderPence)}. Delivery {formatPriceShort(delivery.chilled.chargePence)}
                {delivery.chilled.freeOverPence !== null && `, free over ${formatPriceShort(delivery.chilled.freeOverPence)}`}.
              </p>
              <p><Link href="/delivery" className="font-semibold text-forest underline underline-offset-4">Read delivery information</Link></p>
            </InfoCard>
          </div>
          <SampleNote className="mt-6 max-w-2xl" />
        </div>
      </section>
    </>
  );
}
