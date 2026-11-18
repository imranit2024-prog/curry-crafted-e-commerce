import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { RedeemButton } from "@/components/account-ui";
import { formatDateTime } from "@/components/order-summary";
import { Icon, SampleNote } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { getRewardSummary } from "@/lib/orders";
import { formatPrice } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My rewards" };

export default async function RewardsPage() {
  await requireUser();
  const [summary, config] = await Promise.all([getRewardSummary(), getConfig()]);
  const r = config.rewards;
  const tiers = [1, 2, 5].map((m) => ({ points: r.minRedeemPoints * m, value: r.minRedeemPoints * m * r.pointValuePence }));
  const nextTier = tiers.find((t) => t.points > summary.balance) ?? tiers[tiers.length - 1];
  const progress = Math.min(1, summary.balance / nextTier.points);
  const length = 2 * Math.PI * 52;

  return (
    <div className="space-y-8">
      <h1 className="display text-4xl text-forest">My Rewards</h1>

      {r.doublePoints.active && (
        <div className="on-dark flex items-center gap-4 rounded-3xl bg-forest p-5 text-cream">
          <span className="display grid h-14 w-14 flex-none place-items-center rounded-full bg-gold text-2xl font-semibold text-forest">2×</span>
          <div>
            <p className="eyebrow text-gold">Promotion active</p>
            <p className="mt-1 font-semibold">{r.doublePoints.label}</p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        <div className="on-dark flex flex-col items-center rounded-3xl bg-forest p-7 text-center text-cream">
          <div className="relative h-44 w-44">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(247,243,233,0.14)" strokeWidth="7" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="#E8C46A" strokeWidth="7" strokeLinecap="round" strokeDasharray={length} strokeDashoffset={length * (1 - progress)} className="ring-progress" style={{ "--ring-length": length } as CSSProperties} />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div>
                <p className="display text-5xl">{summary.balance}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-cream/70">points</p>
              </div>
            </div>
          </div>
          <p className="mt-5 font-semibold text-gold">Worth {formatPrice(summary.balance * r.pointValuePence)} off</p>
          <p className="mt-1 text-sm text-cream/75" role="status">
            {summary.balance >= nextTier.points ? "You can redeem any reward below." : `${nextTier.points - summary.balance} more points until ${formatPrice(nextTier.value)} off.`}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {[
            { label: "Total rewards earned", value: `${summary.earned}`, sub: "points, all time", icon: "star" },
            { label: "Rewards redeemed", value: `${summary.redeemed}`, sub: `points · ${formatPrice(summary.redeemed * r.pointValuePence)} saved`, icon: "gift" },
            { label: "How you earn", value: `${r.pointsPerPound}${r.doublePoints.active ? " × 2" : ""}`, sub: `point${r.pointsPerPound === 1 ? "" : "s"} per £1 spent on food`, icon: "sparkle" },
            { label: "Expiry", value: `${r.expiryMonths} mo`, sub: summary.nextExpiry ? `Earliest points expire ${formatDateTime(summary.nextExpiry)}` : "Points expire after this period", icon: "clock" },
          ].map((s) => (
            <div key={s.label} className="rounded-3xl bg-white p-6 shadow-[var(--shadow-card)]">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-sage text-forest"><Icon name={s.icon} className="h-4 w-4" /></span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-charcoal/60">{s.label}</p>
              <p className="display mt-1 text-4xl text-forest">{s.value}</p>
              <p className="mt-1 text-sm text-charcoal/75">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <section aria-labelledby="redeem-heading">
        <h2 id="redeem-heading" className="display text-3xl text-forest">Available rewards</h2>
        <p className="mt-2 text-sm text-charcoal/75">Choose a reward and it&apos;s applied to your basket. You can fine-tune the points you use before you pay.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {tiers.map((t) => {
            const locked = summary.balance < t.points;
            return (
              <div key={t.points} className={`flex flex-col rounded-3xl border p-6 ${locked ? "border-dashed border-forest/20 bg-white" : "border-forest/15 bg-sage"}`}>
                <p className="display text-4xl text-forest">{formatPrice(t.value)} <span className="text-xl">off</span></p>
                <p className="mt-1 text-sm font-medium text-charcoal/80">{t.points} points</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-forest/10"><div className="progress-fill h-full rounded-full bg-forest" style={{ width: `${Math.min(100, (summary.balance / t.points) * 100)}%` }} /></div>
                <p className="mb-5 mt-2 flex-1 text-xs text-charcoal/65">{locked ? `${t.points - summary.balance} more points needed` : "Ready to redeem"}</p>
                <RedeemButton points={t.points} valuePence={t.value} disabled={locked} />
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="display text-3xl text-forest">Points history</h2>
        {summary.history.length === 0 ? (
          <p className="mt-4 rounded-3xl border border-dashed border-forest/20 bg-white p-8 text-center text-sm text-charcoal/70">No points activity yet. Your first order will start your balance.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-3xl bg-white shadow-[var(--shadow-card)]">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-forest/10 text-left text-xs font-semibold uppercase tracking-wider text-charcoal/60">
                  <th scope="col" className="px-5 py-4">Date</th>
                  <th scope="col" className="px-5 py-4">Activity</th>
                  <th scope="col" className="px-5 py-4">Expires</th>
                  <th scope="col" className="px-5 py-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {summary.history.map((h) => (
                  <tr key={h.id} className="border-b border-forest/5 last:border-0">
                    <td className="whitespace-nowrap px-5 py-4 text-charcoal/75">{formatDateTime(h.createdAt)}</td>
                    <td className="px-5 py-4 font-medium text-charcoal">{h.description}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-charcoal/65">{h.expiresAt ? formatDateTime(h.expiresAt) : "–"}</td>
                    <td className={`px-5 py-4 text-right font-bold tabular-nums ${h.points >= 0 ? "text-forest" : "text-charcoal/70"}`}>{h.points > 0 ? `+${h.points}` : h.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SampleNote>Earning rate, point value, minimum redemption and expiry period are configurable placeholders until Curry Crafted confirms its rewards policy.</SampleNote>
    </div>
  );
}
