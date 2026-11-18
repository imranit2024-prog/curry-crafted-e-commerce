import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/blocks";
import { Reveal } from "@/components/client-ui";
import { Breadcrumbs, Eyebrow, Icon, SampleNote, btn } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Our story", description: "How Curry Crafted cooks: small batches, whole spices, and food prepared ahead so it's ready when you are." };

const PILLARS = [
  { icon: "sparkle", title: "Food philosophy", body: "Curry is slow food. We build flavour in layers: spices bloomed in oil, onions taken properly brown, sauces reduced until they coat the spoon. Nothing is rushed, and nothing is there to pad a dish out." },
  { icon: "shield", title: "Product quality", body: "Every dish is cooked in small batches so each pan gets the attention it needs. We taste as we go, and a batch that isn't right doesn't leave the kitchen." },
  { icon: "flame", title: "Preparation approach", body: "Once a dish is at its best we stop the clock. Chilled meals are cooled rapidly and packed for the days ahead; frozen meals are frozen within hours of cooking so they taste freshly made when you heat them." },
];

export default function OurStoryPage() {
  return (
    <>
      <section className="on-dark relative overflow-hidden bg-forest text-cream">
        <Image src="/images/story-kitchen.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/80 to-forest/30" />
        <div className="container-x relative py-16 md:py-28">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Our Story" }]} tone="light" />
          <Eyebrow tone="light" className="mt-10">Our story</Eyebrow>
          <h1 className="display mt-5 max-w-4xl text-[clamp(2.8rem,7.5vw,6rem)]">
            Crafted with Care. <em className="text-gold">Made for Everyday Living.</em>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/85">Curry Crafted exists for the nights you want something genuinely good and have no time to cook it. We do the slow part. You get the best part.</p>
        </div>
      </section>

      <section className="container-x grid gap-12 py-20 md:py-28 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <SectionHeading eyebrow="Why we do it" title="A proper curry shouldn't need a free afternoon." />
        </Reveal>
        <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-charcoal/85 lg:col-span-6 lg:col-start-7">
          <p>The curries people remember are rarely quick. They take patience at the stove: time for spices to open up, for meat to soften, for a sauce to come together. That is exactly the time most of us don&apos;t have on a weeknight.</p>
          <p>So we built a kitchen around doing that work in advance. You order ahead, we cook to order, and your meals arrive chilled for the week or frozen for whenever. All that&apos;s left is a few minutes of heating and somewhere comfortable to sit.</p>
          <p className="display text-3xl italic leading-snug text-forest">We&apos;re not a takeaway. We&apos;re the cooking you&apos;d do yourself, if you had the time.</p>
        </Reveal>
      </section>

      <section className="bg-cream-dark/60 py-20 md:py-28">
        <div className="container-x">
          <div className="grid gap-6 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 100} className="rounded-3xl bg-white p-8 shadow-[var(--shadow-card)]">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-forest text-gold"><Icon name={p.icon} className="h-6 w-6" /></span>
                <h2 className="display mt-6 text-3xl text-forest">{p.title}</h2>
                <p className="mt-3 text-base leading-relaxed text-charcoal/80">{p.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-20 md:py-28">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <Reveal className="relative aspect-[4/5] overflow-hidden rounded-[2rem] lg:col-span-5">
            <Image src="/images/story-ingredients.jpg" alt="Fresh tomatoes, ginger, garlic, chillies, coriander and whole spices in brass bowls" fill sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover" />
          </Reveal>
          <Reveal delay={120} className="lg:col-span-6 lg:col-start-7">
            <SectionHeading eyebrow="Ingredients" title="It starts with what goes in the pan." />
            <p className="mt-6 text-lg leading-relaxed text-charcoal/85">Ripe tomatoes, fresh ginger and garlic, bunches of coriander, and whole spices that we toast and grind ourselves. Good ingredients treated simply and given time: that is the whole recipe.</p>
            <ul className="mt-8 space-y-4">
              {["Whole spices, toasted and ground in our kitchen", "Fresh aromatics prepared every morning", "Full ingredient and allergen details on every product page"].map((t) => (
                <li key={t} className="flex items-start gap-3 text-base text-charcoal/85">
                  <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-forest text-gold"><Icon name="check" className="h-3.5 w-3.5" /></span>{t}
                </li>
              ))}
            </ul>
            <Link href="/food-information" className="mt-8 inline-flex items-center gap-2 font-semibold text-forest underline underline-offset-4">Allergen &amp; food information <Icon name="arrow-right" className="h-4 w-4" /></Link>
          </Reveal>
        </div>

        <div className="mt-8 grid gap-8 lg:mt-12 lg:grid-cols-2">
          <Reveal className="relative aspect-[4/3] overflow-hidden rounded-[2rem]">
            <Image src="/images/story-packaging.jpg" alt="An insulated delivery box packed with sealed meal trays" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            <p className="on-dark absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest/90 to-transparent p-6 pt-20 text-base font-medium text-cream">Packed to arrive at the right temperature, chilled or frozen.</p>
          </Reveal>
          <Reveal delay={120} className="relative aspect-[4/3] overflow-hidden rounded-[2rem]">
            <Image src="/images/story-table.jpg" alt="A plated lamb curry with rice and naan by a window" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            <p className="on-dark absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest/90 to-transparent p-6 pt-20 text-base font-medium text-cream">On your table in minutes, tasting the way it left our pan.</p>
          </Reveal>
        </div>
        <SampleNote className="mt-8 max-w-2xl">Brand story copy is placeholder text written for this preview. Replace with Curry Crafted&apos;s own story, sourcing details and kitchen photography.</SampleNote>
      </section>

      <section className="on-dark bg-forest py-20 text-center text-cream md:py-28">
        <div className="container-x">
          <h2 className="display mx-auto max-w-3xl text-[clamp(2.4rem,6vw,4.5rem)]">Taste what taking your time <em className="text-gold">tastes like.</em></h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className={btn("gold", "lg")}>Shop the menu</Link>
            <Link href="/bundles" className={btn("outline-light", "lg")}>Build a bundle</Link>
          </div>
        </div>
      </section>
    </>
  );
}
