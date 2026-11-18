import type { Metadata } from "next";
import { headers } from "next/headers";
import { CopyField } from "@/components/account-ui";
import { formatDateTime } from "@/components/order-summary";
import { Icon, SampleNote } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { getRewardSummary } from "@/lib/orders";
import { formatPrice } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Refer a friend" };

export default async function ReferPage() {
  const user = await requireUser();
  const [summary, config, h] = await Promise.all([getRewardSummary(), getConfig(), headers()]);
  const { referral, rewards } = config;
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")).split(",")[0].trim();
  const link = `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? `${proto}://${host}`}/register?ref=${user.referralCode}`;
  const qualified = summary.referrals.filter((r) => r.referral.status === "qualified");
  const earned = qualified.reduce((s, r) => s + r.referral.rewardPoints, 0);

  return (
    <div className="space-y-8">
      <h1 className="display text-4xl text-forest">Refer a Friend</h1>

      <section className="on-dark relative overflow-hidden rounded-[2rem] bg-forest p-7 text-cream md:p-10">
        <div className="grain absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative">
          <p className="eyebrow text-gold">Share the flavour</p>
          <h2 className="display mt-3 max-w-2xl text-4xl md:text-5xl">Give {referral.friendPoints} points. <em className="text-gold">Get {referral.referrerPoints}.</em></h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-cream/85">
            Invite a friend with your personal link. When they create an account and place a first order of {formatPrice(referral.minQualifyingOrderPence)} or more, you receive {referral.referrerPoints} points ({formatPrice(referral.referrerPoints * rewards.pointValuePence)}) and they receive {referral.friendPoints} points.
          </p>
          <div className="mt-7 grid gap-5 lg:grid-cols-[14rem_1fr]">
            <CopyField label="Referral code" value={user.referralCode} mono />
            <CopyField label="Referral link" value={link} />
          </div>
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-3">
        {[
          { label: "Friends joined", value: summary.referrals.length },
          { label: "Qualified referrals", value: qualified.length },
          { label: "Referral points earned", value: earned },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl bg-white p-6 shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/60">{s.label}</p>
            <p className="display mt-2 text-5xl text-forest">{s.value}</p>
          </div>
        ))}
      </div>

      <section aria-labelledby="ref-status">
        <h2 id="ref-status" className="display text-3xl text-forest">Referral status</h2>
        {summary.referrals.length === 0 ? (
          <p className="mt-4 rounded-3xl border border-dashed border-forest/20 bg-white p-8 text-center text-sm text-charcoal/70">No one has joined with your link yet. Share it and your referrals will be tracked here.</p>
        ) : (
          <ul className="mt-4 divide-y divide-forest/10 rounded-3xl bg-white px-5 shadow-[var(--shadow-card)]">
            {summary.referrals.map(({ referral: row, friendName }) => {
              const done = row.status === "qualified";
              const parts = friendName.trim().split(/\s+/);
              return (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                  <div>
                    <p className="font-semibold text-forest">{parts[0]}{parts[1] ? ` ${parts[1][0]}.` : ""}</p>
                    <p className="text-xs text-charcoal/65">Joined {formatDateTime(row.createdAt)}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wider ${done ? "bg-forest text-gold" : "bg-forest/10 text-forest"}`}>
                    <Icon name={done ? "check" : "clock"} className="h-3.5 w-3.5" />
                    {done ? `Qualified · +${row.rewardPoints} points` : "Registered · awaiting qualifying order"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="ref-terms" className="rounded-3xl bg-sage p-6 md:p-8">
        <h2 id="ref-terms" className="display text-2xl text-forest">Referral terms &amp; conditions</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-charcoal/85">
          <li>Your friend must be a new customer and register using your referral link or code.</li>
          <li>The referral qualifies when your friend&apos;s first paid order has a food value of at least {formatPrice(referral.minQualifyingOrderPence)} after discounts.</li>
          <li>Rewards are only issued once the qualifying order has been paid for. Registration alone doesn&apos;t earn a reward.</li>
          <li>You receive {referral.referrerPoints} points and your friend receives {referral.friendPoints} points. Points expire {rewards.expiryMonths} months after they&apos;re issued.</li>
          <li>You can&apos;t refer yourself, and each new customer can only be referred once.</li>
        </ul>
        <SampleNote className="mt-5">Referral reward values and qualifying spend are configurable placeholders pending Curry Crafted&apos;s confirmed referral policy.</SampleNote>
      </section>
    </div>
  );
}
