import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SampleNote, btn } from "@/components/ui";
import { getConfig } from "@/lib/config";
import { formatPrice, formatPriceShort, hourLabel, listWeekdays } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "FAQs" };

export default async function FaqPage() {
  const c = await getConfig();
  const { chilled, frozen } = c.delivery;
  const cs = c.chilledSchedule;
  const fs = c.frozenSchedule;
  const transit = fs.transitDaysMin === fs.transitDaysMax ? `${fs.transitDaysMin}` : `${fs.transitDaysMin} to ${fs.transitDaysMax}`;
  const free = (p: number | null) => (p === null ? "" : ` Delivery is free on orders over ${formatPriceShort(p)}.`);

  const groups: { id: string; title: string; items: [string, string][] }[] = [
    { id: "ordering", title: "Ordering", items: [
      ["Is Curry Crafted a takeaway?", "No. We're a chilled and frozen food business. Everything is cooked to order ahead of time, so you place your order in advance and choose when it's delivered."],
      ["Do I need an account to order?", c.guestCheckout ? "No, you can check out as a guest. Creating a free account lets you save addresses, reorder quickly and earn reward points." : "Yes, an account is needed so we can keep your order history and rewards in one place."],
      ["Can I order chilled and frozen together?", "Yes. They sit in the same basket but are grouped separately, because each range has its own minimum order, delivery charge and delivery method. They may arrive on different days."],
      ["Is there a minimum order?", `Yes: ${formatPriceShort(chilled.minOrderPence)} for chilled and ${formatPriceShort(frozen.minOrderPence)} for frozen. Each minimum applies to that range on its own.`],
    ]},
    { id: "chilled", title: "Chilled delivery", items: [
      ["Where do you deliver chilled meals?", "Chilled meals are delivered by our own refrigerated service to selected postcodes only. Use the postcode checker on any page to see whether yours is covered."],
      ["Why can't I add a chilled dish to my basket?", "We confirm your postcode before chilled dishes can be added. If your postcode is outside our chilled area the dish can't be ordered, but the frozen range is delivered UK-wide."],
      ["How much is chilled delivery?", `${formatPrice(chilled.chargePence)} per order.${free(chilled.freeOverPence)}`],
    ]},
    { id: "frozen", title: "Frozen delivery", items: [
      ["Where do you deliver frozen meals?", "Across the UK by tracked courier, packed in insulated boxes. A small number of remote postcodes carry a surcharge or can't be reached; you'll see this when you enter your postcode."],
      ["How much is frozen delivery?", `${formatPrice(frozen.chargePence)} per order.${free(frozen.freeOverPence)} Any remote-area surcharge is shown before you pay.`],
      ["Do I choose a time slot for frozen?", `No. Frozen orders are dispatched on ${listWeekdays(fs.dispatchWeekdays)} and usually arrive ${transit} working day${fs.transitDaysMax === 1 ? "" : "s"} later. You'll see an estimated delivery date at checkout.`],
    ]},
    { id: "schedules", title: "Delivery schedules", items: [
      ["Which days do you deliver chilled?", `${listWeekdays(cs.deliveryWeekdays)}, in these time slots: ${cs.slots.map((s) => s.label).join(", ")}.`],
      ["What is the order cut-off?", `For chilled, order by ${hourLabel(cs.cutoffHour)} ${cs.cutoffDaysBefore} day${cs.cutoffDaysBefore === 1 ? "" : "s"} before your delivery day. For frozen, order by ${hourLabel(fs.cutoffHour)} on a dispatch day to be sent that day.`],
      ["How far ahead can I order?", `You can book a chilled delivery up to ${cs.horizonDays} days in advance. Slots that are fully booked or past their cut-off can't be selected.`],
    ]},
    { id: "payment", title: "Payment", items: [
      ["How do I pay?", "By card at checkout. Payments are processed securely by Stripe, and Curry Crafted never sees or stores your full card number."],
      ["What happens if my payment fails?", "You won't be charged and your basket and delivery choices are kept, so you can try again or use a different card."],
      ["Could I be charged twice?", "No. Each order attempt can only be paid once, even if you press the button twice or refresh the page."],
    ]},
    { id: "rewards", title: "Rewards", items: [
      ["How do I earn points?", `Sign in when you order and you'll earn ${c.rewards.pointsPerPound} point${c.rewards.pointsPerPound === 1 ? "" : "s"} for every £1 spent on food.${c.rewards.doublePoints.active ? ` Right now: ${c.rewards.doublePoints.label.toLowerCase()}.` : ""}`],
      ["What are points worth?", `Each point is worth ${c.rewards.pointValuePence}p. You can redeem from ${c.rewards.minRedeemPoints} points (${formatPrice(c.rewards.minRedeemPoints * c.rewards.pointValuePence)}) in your basket.`],
      ["Do points expire?", `Points expire ${c.rewards.expiryMonths} months after they're earned.`],
    ]},
    { id: "referrals", title: "Referrals", items: [
      ["How does refer a friend work?", `Share your personal link from your account. When a new customer registers with it and places a first order of ${formatPrice(c.referral.minQualifyingOrderPence)} or more, you receive ${c.referral.referrerPoints} points and they receive ${c.referral.friendPoints}.`],
      ["When do I get my referral reward?", "As soon as your friend's qualifying order has been paid for. Registration on its own doesn't earn a reward."],
    ]},
    { id: "storage", title: "Product storage", items: [
      ["How long do chilled meals keep?", "Keep them in the fridge at 5°C or below and eat by the use-by date on the pack. Most chilled dishes can be frozen at home on the day of delivery."],
      ["How should I store frozen meals?", "Put them straight in the freezer at -18°C or below. If a meal has defrosted, keep it in the fridge, eat within 24 hours and don't refreeze."],
      ["Where do I find heating instructions?", "On every product page and on the pack. Always check food is piping hot throughout before serving."],
    ]},
  ];

  return (
    <>
      <PageHero crumbs={[{ label: "Home", href: "/" }, { label: "FAQs" }]} eyebrow="Help centre" title={<>Frequently Asked <em className="text-gold">Questions.</em></>} intro="Everything you need to know about ordering ahead, chilled and frozen delivery, payment and rewards." />
      <div className="container-x grid gap-10 py-12 md:py-16 lg:grid-cols-[15rem_1fr]">
        <nav aria-label="FAQ topics" className="lg:sticky lg:top-24 lg:h-fit">
          <ul className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:block lg:space-y-1 lg:px-0">
            {groups.map((g) => (
              <li key={g.id} className="flex-none"><a href={`#${g.id}`} className="flex h-11 items-center whitespace-nowrap rounded-full border border-forest/15 bg-white px-4 text-sm font-semibold text-forest hover:bg-forest hover:text-cream lg:border-0 lg:bg-transparent">{g.title}</a></li>
            ))}
          </ul>
        </nav>
        <div className="space-y-12">
          <SampleNote>Delivery charges, minimums, cut-offs, slots and reward rates quoted here are read from the store configuration and currently hold placeholder values.</SampleNote>
          {groups.map((g) => (
            <section key={g.id} id={g.id} aria-labelledby={`${g.id}-h`} className="scroll-mt-28">
              <h2 id={`${g.id}-h`} className="display text-3xl text-forest">{g.title}</h2>
              <div className="mt-4 rounded-3xl bg-white px-5 shadow-[var(--shadow-card)] md:px-7">
                {g.items.map(([q, a]) => (
                  <details key={q} className="group border-b border-forest/10 last:border-0">
                    <summary className="flex min-h-16 items-center justify-between gap-4 py-4 font-semibold text-forest">
                      {q}
                      <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-sage text-xl leading-none transition-transform duration-300 group-open:rotate-45" aria-hidden="true">+</span>
                    </summary>
                    <p className="pb-6 pr-10 text-sm leading-relaxed text-charcoal/85">{a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
          <div className="rounded-3xl bg-sage p-8 text-center">
            <p className="display text-3xl text-forest">Still have a question?</p>
            <Link href="/contact" className={btn("primary", "md", "mt-5")}>Contact us</Link>
          </div>
        </div>
      </div>
    </>
  );
}
