import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { BundleCard, SectionHeading } from "@/components/blocks";
import { Reveal } from "@/components/client-ui";
import { ChilledStatus, PostcodeChecker } from "@/components/postcode";
import { ProductCard } from "@/components/product-card";
import { SchedulePreview } from "@/components/schedule";
import { Eyebrow, Icon, RangeBadge, btn } from "@/components/ui";
import { getBundles, getProducts } from "@/lib/catalog";
import { getConfig } from "@/lib/config";
import { formatPrice, formatPriceShort, hourLabel, listWeekdays } from "@/lib/types";

export const dynamic = "force-dynamic";

const STEAM = [
  { left: "4%", dur: "7.5s", delay: "-1s", sway: 1 },
  { left: "24%", dur: "6.4s", delay: "-3.2s", sway: -1 },
  { left: "44%", dur: "8.2s", delay: "-5.5s", sway: 1 },
  { left: "62%", dur: "7s", delay: "-2.4s", sway: -1 },
  { left: "34%", dur: "9s", delay: "-6.8s", sway: -1 },
  { left: "14%", dur: "8.6s", delay: "-4.4s", sway: 1 },
];

function Hero() {
  return (
    <section className="on-dark relative overflow-hidden bg-forest text-cream">
      <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
        <filter id="steam-warp" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.011 0.028" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="42" />
        </filter>
      </svg>
      <div className="grain absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-[12%] top-[4%] h-[78vmin] w-[78vmin] rounded-full bg-[radial-gradient(circle,rgba(232,196,106,0.2),transparent_62%)]" aria-hidden="true" />

      <div className="container-x relative grid items-center gap-2 pb-32 pt-10 md:pb-40 lg:min-h-[calc(100svh-7.5rem)] lg:grid-cols-12 lg:gap-6 lg:pt-4">
        <div className="relative z-10 lg:col-span-6">
          <div className="fade-up" style={{ "--i": -2 } as CSSProperties}>
            <Eyebrow tone="light">Chilled &amp; frozen, made to order ahead</Eyebrow>
          </div>
          <h1 className="display mt-6 text-[clamp(3rem,8.2vw,6.6rem)] leading-[0.96] text-cream">
            <span className="hero-line" style={{ "--i": 0 } as CSSProperties}>
              <span>Real Flavour.</span>
            </span>
            <span className="hero-line" style={{ "--i": 1 } as CSSProperties}>
              <span className="italic text-gold">Ready When</span>
            </span>
            <span className="hero-line" style={{ "--i": 2 } as CSSProperties}>
              <span className="italic text-gold">You Are.</span>
            </span>
          </h1>
          <p className="fade-up mt-7 max-w-xl text-base leading-relaxed text-cream/85 md:text-lg" style={{ "--i": 4 } as CSSProperties}>
            Discover handcrafted chilled meals and frozen favourites, prepared with care and delivered straight to your door.
          </p>
          <div className="fade-up mt-9 flex flex-col gap-3 sm:flex-row" style={{ "--i": 5 } as CSSProperties}>
            <Link href="/chilled" className={btn("gold", "lg", "group")}>
              Explore Chilled Meals
              <Icon name="arrow-right" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href="/frozen" className={btn("outline-light", "lg")}>
              Discover Frozen Range
            </Link>
          </div>
          <ul className="fade-up mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-cream/15 pt-6 text-xs leading-snug text-cream/75 sm:text-sm" style={{ "--i": 7 } as CSSProperties}>
            <li>
              <Icon name="drop" className="mb-2 h-5 w-5 text-gold" />
              <strong className="block font-semibold text-cream">Chilled</strong>
              Selected postcodes
            </li>
            <li>
              <Icon name="snowflake" className="mb-2 h-5 w-5 text-gold" />
              <strong className="block font-semibold text-cream">Frozen</strong>
              Delivered UK-wide
            </li>
            <li>
              <Icon name="calendar" className="mb-2 h-5 w-5 text-gold" />
              <strong className="block font-semibold text-cream">Order ahead</strong>
              Choose your day
            </li>
          </ul>
        </div>

        <div className="relative order-first lg:order-none lg:col-span-6" aria-hidden="true">
          <div className="relative mx-auto aspect-square w-[min(100%,24rem)] sm:w-[min(100%,30rem)] lg:ml-[-6%] lg:w-[120%]">
            <div className="spice-layer is-far" />
            <div className="spice-layer" />
            <div className="bob absolute inset-0">
              <div className="hero-bowl absolute inset-0 [mask-image:radial-gradient(closest-side,#000_68%,transparent_100%)] [-webkit-mask-image:radial-gradient(closest-side,#000_68%,transparent_100%)]">
                <Image src="/images/hero-bowl.jpg" alt="" fill priority sizes="(min-width: 1024px) 52vw, 90vw" className="object-cover" />
              </div>
              <div className="steam">
                {STEAM.map((s, i) => (
                  <span key={i} style={{ left: s.left, "--dur": s.dur, "--delay": s.delay, "--sway": s.sway } as CSSProperties} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [products, bundles, config] = await Promise.all([getProducts(), getBundles(), getConfig()]);
  const featured = products.filter((p) => p.featured && p.available).slice(0, 8);
  const homeBundles = bundles.filter((b) => b.range === "chilled").slice(0, 3);
  const { rewards, referral, chilledSchedule, frozenSchedule, delivery } = config;

  const rewardCards = [
    { icon: "star", title: "Earn reward points", body: `Collect ${rewards.pointsPerPound} point${rewards.pointsPerPound === 1 ? "" : "s"} for every £1 you spend on food, automatically, on every order.` },
    { icon: "gift", title: "Redeem customer rewards", body: `Turn points into money off at checkout. ${rewards.minRedeemPoints} points is worth ${formatPrice(rewards.minRedeemPoints * rewards.pointValuePence)}.` },
    { icon: "users", title: "Refer a friend", body: `Share your link. When a friend places a qualifying first order you receive ${referral.referrerPoints} points and they receive ${referral.friendPoints}.` },
    { icon: "tag", title: "Exclusive offers", body: "Members hear first about new dishes, seasonal specials and member-only offers, if they choose to receive our emails." },
  ];

  return (
    <>
      <Hero />

      {/* 2. Postcode checker */}
      <section className="relative z-10 -mt-20 md:-mt-24" aria-labelledby="postcode-heading">
        <div className="container-x">
          <Reveal className="grid gap-8 rounded-[2rem] bg-white p-6 shadow-[var(--shadow-lift)] ring-1 ring-gold-muted/30 md:p-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <Eyebrow>Delivery check</Eyebrow>
              <h2 id="postcode-heading" className="display mt-4 text-[clamp(2rem,4vw,3rem)] text-forest">
                Can We Deliver to You?
              </h2>
              <p className="mt-4 text-base leading-relaxed text-charcoal/80">Enter your postcode to discover which Curry Crafted meals are available in your area.</p>
            </div>
            <div className="lg:col-span-8">
              <PostcodeChecker id="home-postcode" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3. Shop by collection */}
      <section className="container-x py-20 md:py-28" aria-labelledby="collections-heading">
        <Reveal>
          <SectionHeading eyebrow="Shop by collection" title={<span id="collections-heading">One kitchen. Two ways to enjoy it.</span>} intro="The same recipes and the same care, prepared two ways: chilled for this week, or frozen for whenever you need them." />
        </Reveal>
        <div className="mt-12 grid gap-6 lg:grid-cols-12">
          <Reveal as="article" className="group relative min-h-[34rem] overflow-hidden rounded-[2rem] bg-forest text-cream lg:col-span-7 lg:min-h-[44rem]">
            <Image src="/images/collection-chilled.jpg" alt="Bowls of chicken tikka masala, tarka dal and saffron rice" fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover transition-transform duration-[1600ms] ease-[var(--ease-expo)] group-hover:scale-[1.05]" />
            <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/45 to-transparent" />
            <RangeBadge range="chilled" className="absolute left-6 top-6" />
            <div className="on-dark absolute inset-x-0 bottom-0 p-6 md:p-10">
              <h3 className="display text-[clamp(2.2rem,4.5vw,3.6rem)]">The Chilled Collection</h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-cream/85">Cooked in small batches, blast chilled and delivered by our own refrigerated service on the day and time slot you choose.</p>
              <ChilledStatus tone="dark" className="mt-4" />
              <Link href="/chilled" className={btn("gold", "lg", "mt-6")}>
                Explore Chilled <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
          <Reveal as="article" delay={140} className="group relative min-h-[30rem] overflow-hidden rounded-[2rem] bg-forest text-cream lg:col-span-5 lg:mt-24 lg:min-h-[38rem]">
            <Image src="/images/collection-frozen.jpg" alt="Frozen curry and rice meal trays covered in frost" fill sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover transition-transform duration-[1600ms] ease-[var(--ease-expo)] group-hover:scale-[1.05]" />
            <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/50 to-transparent" />
            <RangeBadge range="frozen" className="absolute left-6 top-6" />
            <div className="on-dark absolute inset-x-0 bottom-0 p-6 md:p-10">
              <h3 className="display text-[clamp(2.2rem,4.5vw,3.2rem)]">The Frozen Collection</h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-cream/85">Frozen within hours of cooking to hold every bit of flavour. Stock the freezer and dinner is always ready.</p>
              <p className="mt-4 flex items-start gap-2 text-sm text-cream/85">
                <Icon name="truck" className="mt-0.5 h-4 w-4 flex-none text-gold" /> Delivered UK-wide by tracked courier.
              </p>
              <Link href="/frozen" className={btn("gold", "lg", "mt-6")}>
                Explore Frozen <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 4. Featured signature dishes */}
      <section className="bg-cream-dark/60 py-20 md:py-28" aria-labelledby="featured-heading">
        <div className="container-x">
          <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow="Signature dishes" title={<span id="featured-heading">Discover Your New Favourite.</span>} intro="The dishes our kitchen is proudest of, from slow-braised lamb to silky makhani." />
            <Link href="/shop" className={btn("outline", "md", "flex-none self-start md:self-auto")}>
              View the full menu <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Build your meal */}
      <section className="on-dark relative overflow-hidden bg-forest py-20 text-cream md:py-28" aria-labelledby="bundles-heading">
        <div className="grain absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container-x relative">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <Reveal className="lg:col-span-5">
              <SectionHeading tone="light" eyebrow="Build your meal" title={<span id="bundles-heading">Make Every Meal a Little More Special.</span>} intro="Choose a bundle, pick the mains and sides you love, and save against buying them one by one. Your total updates as you build." />
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/bundles" className={btn("gold", "lg")}>
                  Build Your Bundle
                </Link>
                <Link href="/bundles?range=frozen" className={btn("outline-light", "lg")}>
                  See frozen bundles
                </Link>
              </div>
            </Reveal>
            <Reveal delay={120} className="relative aspect-[3/2] overflow-hidden rounded-[2rem] ring-1 ring-gold/30 lg:col-span-7">
              <Image src="/images/bundle-feast.jpg" alt="A table spread of curries, rice, naan and chutneys" fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
            </Reveal>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {homeBundles.map((b, i) => (
              <Reveal key={b.id} delay={i * 100}>
                <BundleCard bundle={b} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Advance ordering */}
      <section className="container-x py-20 md:py-28" aria-labelledby="schedule-heading">
        <div className="grid items-start gap-12 lg:grid-cols-12">
          <Reveal className="lg:sticky lg:top-28 lg:col-span-5">
            <SectionHeading eyebrow="Advance ordering" title={<span id="schedule-heading">Your Meals. Your Schedule.</span>} intro="Curry Crafted isn't a takeaway. Everything is cooked to order, so you plan ahead and we do the rest." />
            <ol className="mt-8 space-y-5">
              {[
                { title: "Choose your dishes", body: "Mix chilled meals for this week with frozen favourites for later." },
                {
                  title: "Pick a chilled delivery slot",
                  body: `Chilled deliveries run ${listWeekdays(chilledSchedule.deliveryWeekdays)}. Order by ${hourLabel(chilledSchedule.cutoffHour)}, ${chilledSchedule.cutoffDaysBefore} day${chilledSchedule.cutoffDaysBefore === 1 ? "" : "s"} before.`,
                },
                {
                  title: "Frozen arrives by courier",
                  body: `Frozen orders are dispatched ${listWeekdays(frozenSchedule.dispatchWeekdays)} and usually arrive ${frozenSchedule.transitDaysMin === frozenSchedule.transitDaysMax ? frozenSchedule.transitDaysMin : `${frozenSchedule.transitDaysMin}–${frozenSchedule.transitDaysMax}`} working day${frozenSchedule.transitDaysMax === 1 ? "" : "s"} later. No time slot needed.`,
                },
              ].map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="display grid h-11 w-11 flex-none place-items-center rounded-full border border-gold-muted text-lg text-forest">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-forest">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-charcoal/75">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-sm text-charcoal/70">
              Minimum order {formatPriceShort(delivery.chilled.minOrderPence)} chilled, {formatPriceShort(delivery.frozen.minOrderPence)} frozen.{" "}
              <Link href="/delivery" className="font-semibold text-forest underline underline-offset-4">
                Full delivery information
              </Link>
            </p>
          </Reveal>
          <Reveal delay={120} className="lg:col-span-7">
            <SchedulePreview />
            <p className="mt-4 text-center text-xs text-charcoal/60">This is a live preview. You&apos;ll confirm your delivery day and slot at checkout.</p>
          </Reveal>
        </div>
      </section>

      {/* 7. Brand storytelling */}
      <section className="bg-cream-dark/60 py-20 md:py-28" aria-labelledby="story-heading">
        <div className="container-x">
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
            <Reveal className="relative aspect-[4/3] overflow-hidden rounded-[2rem] lg:col-span-7 lg:aspect-auto lg:min-h-[34rem]">
              <Image src="/images/story-kitchen.jpg" alt="A chef stirring a large pot of curry in a professional kitchen" fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
            </Reveal>
            <Reveal delay={100} className="flex flex-col justify-center lg:col-span-5 lg:pl-6">
              <SectionHeading eyebrow="Our kitchen" title={<span id="story-heading">Crafted with Care. Made for Everyday Living.</span>} />
              <p className="mt-6 text-base leading-relaxed text-charcoal/80 md:text-lg">
                We cook the way you would if you had the time: whole spices toasted and ground, onions browned slowly, sauces left to reduce until they taste right. Then we chill or freeze each dish at its best, so it reaches your table tasting the way it left our pan.
              </p>
              <Link href="/our-story" className={btn("primary", "lg", "mt-8 self-start")}>
                Read our story <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:mt-8 lg:grid-cols-12 lg:gap-8">
            <Reveal className="relative aspect-[4/5] overflow-hidden rounded-[2rem] lg:col-span-4">
              <Image src="/images/story-ingredients.jpg" alt="Fresh tomatoes, ginger, garlic, chillies, coriander and whole spices" fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover" />
              <p className="on-dark absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest/90 to-transparent p-6 pt-16 text-sm font-medium text-cream">Fresh ingredients and whole spices, prepared every morning.</p>
            </Reveal>
            <Reveal delay={100} className="relative aspect-[4/5] overflow-hidden rounded-[2rem] lg:col-span-4">
              <Image src="/images/story-packaging.jpg" alt="An insulated delivery box packed with sealed meal trays" fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover" />
              <p className="on-dark absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest/90 to-transparent p-6 pt-16 text-sm font-medium text-cream">Packed in insulated boxes to arrive at the right temperature.</p>
            </Reveal>
            <Reveal delay={200} className="flex flex-col justify-between rounded-[2rem] bg-forest p-8 text-cream sm:col-span-2 lg:col-span-4">
              <Icon name="sparkle" className="h-8 w-8 text-gold" />
              <p className="display mt-10 text-3xl italic leading-tight text-cream md:text-[2.1rem]">Good curry can&apos;t be hurried. So we take our time, and give you yours back.</p>
              <p className="eyebrow mt-8 text-gold">The Curry Crafted kitchen</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 8. Customer rewards */}
      <section className="bg-sage py-20 md:py-28" aria-labelledby="rewards-heading">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <SectionHeading eyebrow="Customer rewards" title={<span id="rewards-heading">A Little More Love in Every Order.</span>} intro="Create a free account and every order earns points towards money off the next one. No tiers, no fuss." />
            {rewards.doublePoints.active && (
              <div className="mt-7 flex items-start gap-4 rounded-3xl bg-forest p-5 text-cream">
                <span className="display grid h-14 w-14 flex-none place-items-center rounded-full bg-gold text-2xl font-semibold text-forest">2×</span>
                <div>
                  <p className="eyebrow text-gold">Double-points promotion</p>
                  <p className="mt-1.5 font-semibold">{rewards.doublePoints.label}</p>
                  <p className="mt-1 text-sm text-cream/75">Applied automatically at checkout for members.</p>
                </div>
              </div>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/register" className={btn("primary", "lg")}>
                Join Rewards
              </Link>
              <Link href="/login" className="text-sm font-semibold text-forest underline underline-offset-4">
                Already a member? Sign in
              </Link>
            </div>
            <p className="mt-6 text-xs text-charcoal/60">Reward rates shown are placeholders pending Curry Crafted&apos;s confirmed rewards policy.</p>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
            {rewardCards.map((card, i) => (
              <Reveal key={card.title} delay={i * 90} className="rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] md:p-7">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-forest text-gold">
                  <Icon name={card.icon} />
                </span>
                <h3 className="display mt-5 text-2xl text-forest">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal/75">{card.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Testimonials (placeholders until approved reviews are supplied) */}
      <section className="container-x py-20 md:py-28" aria-labelledby="reviews-heading">
        <Reveal>
          <SectionHeading align="center" eyebrow="From our customers" title={<span id="reviews-heading">Words From the Table.</span>} intro="This space is reserved for real, approved customer reviews." />
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Reveal key={i} delay={i * 100} as="article" className="flex flex-col rounded-3xl border border-dashed border-forest/25 bg-white p-7">
              <div className="flex items-center justify-between">
                <span className="flex gap-1 text-forest/25" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Icon key={s} name="star" className="h-4 w-4" />
                  ))}
                </span>
                <span className="rounded-full bg-gold/25 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-forest">Placeholder</span>
              </div>
              <p className="display mt-6 flex-1 text-2xl italic leading-snug text-forest/55">An approved customer review will appear here, with its star rating.</p>
              <div className="mt-8 flex items-center gap-3 border-t border-forest/10 pt-5">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-sage text-forest/50">
                  <Icon name="user" />
                </span>
                <div className="text-sm">
                  <p className="font-semibold text-forest/60">Customer name</p>
                  <p className="text-charcoal/50">Verified order · location</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 10. Final CTA */}
      <section className="on-dark relative overflow-hidden bg-forest text-cream" aria-labelledby="cta-heading">
        <Image src="/images/story-table.jpg" alt="" fill sizes="100vw" className="object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/85 to-forest/40" />
        <div className="container-x relative py-24 md:py-36">
          <Reveal className="max-w-3xl">
            <Eyebrow tone="light">Order ahead</Eyebrow>
            <h2 id="cta-heading" className="display mt-5 text-[clamp(2.6rem,6.5vw,5.2rem)] text-cream">
              Good Food Is Always <em className="text-gold">Worth Planning For.</em>
            </h2>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/shop" className={btn("gold", "lg")}>
                Shop Now <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
              <Link href="/bundles" className={btn("outline-light", "lg")}>
                Build a bundle
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
