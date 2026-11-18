import type { Metadata } from "next";
import Link from "next/link";
import { InfoCard } from "@/components/blocks";
import { PostcodeChecker } from "@/components/postcode";
import { SchedulePreview } from "@/components/schedule";
import { Eyebrow, PageHero, RangeBadge, SampleNote } from "@/components/ui";
import { getConfig } from "@/lib/config";
import { getFrozenRestrictions } from "@/lib/orders";
import { formatPrice, hourLabel, listWeekdays } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Delivery information & policy", description: "Chilled delivery to selected postcodes and frozen delivery UK-wide: coverage, charges, minimum orders, cut-offs and scheduling." };

export default async function DeliveryPage() {
  const [c, restrictions] = await Promise.all([getConfig(), getFrozenRestrictions()]);
  const { chilled, frozen } = c.delivery;
  const cs = c.chilledSchedule;
  const fs = c.frozenSchedule;
  const transit = fs.transitDaysMin === fs.transitDaysMax ? `${fs.transitDaysMin}` : `${fs.transitDaysMin}–${fs.transitDaysMax}`;
  const surcharge = restrictions.filter((r) => r.kind === "surcharge");
  const excluded = restrictions.filter((r) => r.kind === "excluded");

  return (
    <>
      <PageHero crumbs={[{ label: "Home", href: "/" }, { label: "Delivery Information" }]} eyebrow="Delivery information & policy" title={<>Two Ranges. <em className="text-gold">Two Ways to Deliver.</em></>} intro="Chilled meals are delivered by our own refrigerated service to selected postcodes. Frozen meals are sent UK-wide by tracked courier. Here's exactly how each works." />

      <section className="container-x relative z-10 -mt-8" aria-labelledby="coverage-heading">
        <div className="grid gap-6 rounded-[2rem] bg-white p-6 shadow-[var(--shadow-lift)] ring-1 ring-gold-muted/30 md:p-9 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Eyebrow>Delivery coverage</Eyebrow>
            <h2 id="coverage-heading" className="display mt-3 text-3xl text-forest md:text-4xl">Check your postcode</h2>
            <p className="mt-3 text-sm leading-relaxed text-charcoal/75">A valid UK postcode doesn&apos;t automatically qualify for chilled delivery. We check every postcode against our delivery area, and remember your result while you shop.</p>
          </div>
          <div className="lg:col-span-8"><PostcodeChecker id="delivery-postcode" /></div>
        </div>
      </section>

      <div className="container-x space-y-16 py-14 md:py-20">
        <section aria-labelledby="compare-heading">
          <h2 id="compare-heading" className="display text-3xl text-forest md:text-4xl">Charges, minimums and cut-offs</h2>
          <div className="mt-6 overflow-x-auto rounded-3xl bg-white shadow-[var(--shadow-card)]" tabIndex={0} role="region" aria-label="Delivery comparison">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-forest/15">
                  <th scope="col" className="w-1/4 px-5 py-5 text-left text-xs font-semibold uppercase tracking-wider text-charcoal/60">&nbsp;</th>
                  <th scope="col" className="px-5 py-5 text-left"><RangeBadge range="chilled" /></th>
                  <th scope="col" className="px-5 py-5 text-left"><RangeBadge range="frozen" /></th>
                </tr>
              </thead>
              <tbody className="[&_td]:px-5 [&_td]:py-4 [&_td]:align-top [&_td]:leading-relaxed [&_td]:text-charcoal/85 [&_th]:px-5 [&_th]:py-4 [&_th]:text-left [&_th]:align-top [&_th]:font-semibold [&_th]:text-forest [&_tr]:border-b [&_tr]:border-forest/5">
                <tr><th scope="row">Delivery coverage</th><td>Selected postcodes only, validated at checkout</td><td>UK-wide, subject to the restrictions below</td></tr>
                <tr><th scope="row">Delivery method</th><td>Curry Crafted refrigerated delivery</td><td>Tracked courier in insulated packaging</td></tr>
                <tr><th scope="row">Minimum order value</th><td>{formatPrice(chilled.minOrderPence)}</td><td>{formatPrice(frozen.minOrderPence)}</td></tr>
                <tr><th scope="row">Delivery charge</th><td>{formatPrice(chilled.chargePence)}{chilled.freeOverPence !== null && <>; free over {formatPrice(chilled.freeOverPence)}</>}</td><td>{formatPrice(frozen.chargePence)}{frozen.freeOverPence !== null && <>; free over {formatPrice(frozen.freeOverPence)}</>}{surcharge.length > 0 && "; remote-area surcharge may apply"}</td></tr>
                <tr><th scope="row">Delivery days</th><td>{listWeekdays(cs.deliveryWeekdays)}</td><td>Dispatched {listWeekdays(fs.dispatchWeekdays)}; arrives {transit} working day{fs.transitDaysMax === 1 ? "" : "s"} later</td></tr>
                <tr><th scope="row">Time slots</th><td>{cs.slots.map((s) => s.label).join(", ")}</td><td>None. Courier delivery during the day.</td></tr>
                <tr><th scope="row">Order cut-off</th><td>{hourLabel(cs.cutoffHour)}, {cs.cutoffDaysBefore} day{cs.cutoffDaysBefore === 1 ? "" : "s"} before delivery</td><td>{hourLabel(fs.cutoffHour)} on the dispatch day</td></tr>
                <tr className="!border-0"><th scope="row">Booking ahead</th><td>Up to {cs.horizonDays} days in advance</td><td>Sent on the next available dispatch day</td></tr>
              </tbody>
            </table>
          </div>
          <SampleNote className="mt-4 max-w-3xl">All charges, minimums, days, slots and cut-offs are read from the store configuration and currently hold placeholder values awaiting Curry Crafted&apos;s confirmed delivery policy.</SampleNote>
        </section>

        <section aria-labelledby="schedule-heading" className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="schedule-heading" className="display text-3xl text-forest md:text-4xl">Delivery scheduling</h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-charcoal/85">
              <p>At checkout you choose a delivery day and time slot for chilled meals. Slots that are fully booked, or whose order cut-off has passed, can&apos;t be selected.</p>
              <p>Frozen meals don&apos;t use time slots. You&apos;ll see the next dispatch day and an estimated delivery date before you pay.</p>
              <p className="rounded-2xl bg-sage p-4 text-sm"><strong className="text-forest">Ordering both ranges?</strong> Chilled and frozen items are fulfilled separately. Each has its own minimum order and delivery charge, and they may arrive on different days.</p>
            </div>
          </div>
          <div className="lg:col-span-7"><SchedulePreview /></div>
        </section>

        <section aria-labelledby="restrictions-heading">
          <h2 id="restrictions-heading" className="display text-3xl text-forest md:text-4xl">Restrictions</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <InfoCard icon="drop" title="Chilled postcode restrictions">
              <p>Chilled food must stay refrigerated in transit, so it&apos;s only available where our own service delivers. Chilled items can&apos;t be added to the basket, or checked out, for a postcode outside that area.</p>
            </InfoCard>
            <InfoCard icon="snowflake" title="Frozen surcharge areas">
              {surcharge.length ? (
                <>
                  <p>An extended courier service applies to postcodes beginning:</p>
                  <ul className="space-y-1">{surcharge.map((r) => <li key={r.id}><strong className="text-forest">{r.prefix}</strong>: +{formatPrice(r.surchargePence)}</li>)}</ul>
                </>
              ) : <p>No surcharge areas are currently configured.</p>}
            </InfoCard>
            <InfoCard icon="alert" title="Areas we can't reach">
              {excluded.length ? (
                <>
                  <p>Frozen delivery isn&apos;t currently available to postcodes beginning:</p>
                  <p><strong className="text-forest">{excluded.map((r) => r.prefix).join(", ")}</strong></p>
                </>
              ) : <p>No excluded areas are currently configured.</p>}
            </InfoCard>
          </div>
        </section>

        <section aria-labelledby="day-heading" className="rounded-3xl bg-sage p-6 md:p-9">
          <h2 id="day-heading" className="display text-3xl text-forest">On delivery day</h2>
          <ul className="mt-5 grid gap-4 text-sm leading-relaxed text-charcoal/85 md:grid-cols-3">
            <li><strong className="block text-forest">Someone should be in</strong>Chilled and frozen food needs to go straight into the fridge or freezer when it arrives.</li>
            <li><strong className="block text-forest">Check your order</strong>Check the pack labels for use-by dates, ingredients and allergens before eating.</li>
            <li><strong className="block text-forest">Something not right?</strong>Please <Link href="/contact" className="font-semibold text-forest underline underline-offset-4">contact us</Link> as soon as possible. See our <Link href="/legal/returns" className="font-semibold text-forest underline underline-offset-4">Returns / Cancellation Policy</Link>.</li>
          </ul>
        </section>

        <p className="text-sm text-charcoal/70">
          Related policies: <Link href="/legal/terms" className="font-semibold text-forest underline underline-offset-4">Terms &amp; Conditions</Link> · <Link href="/legal/returns" className="font-semibold text-forest underline underline-offset-4">Returns / Cancellation</Link> · <Link href="/legal/privacy" className="font-semibold text-forest underline underline-offset-4">Privacy</Link> · <Link href="/legal/cookies" className="font-semibold text-forest underline underline-offset-4">Cookies</Link> · <Link href="/faqs" className="font-semibold text-forest underline underline-offset-4">FAQs</Link>
        </p>
      </div>
    </>
  );
}
