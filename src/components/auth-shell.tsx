import Image from "next/image";
import type { ReactNode } from "react";
import { Eyebrow, Icon } from "./ui";

export function safeNext(next: string | undefined, fallback = "/account"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}

export function AuthShell({ eyebrow, title, intro, children, footer }: { eyebrow: string; title: ReactNode; intro: string; children: ReactNode; footer: ReactNode }) {
  return (
    <section className="grid min-h-[calc(100dvh-7.5rem)] lg:grid-cols-2">
      <div className="on-dark relative hidden overflow-hidden bg-forest text-cream lg:block">
        <Image src="/images/story-table.jpg" alt="" fill sizes="50vw" className="object-cover opacity-45" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/60 to-forest/30" />
        <div className="relative flex h-full flex-col justify-end p-14">
          <p className="display max-w-md text-5xl leading-tight">
            A little more love in <em className="text-gold">every order.</em>
          </p>
          <ul className="mt-8 space-y-3 text-sm text-cream/85">
            {["Earn reward points on every order", "Save addresses and reorder favourites in a tap", "Share your referral link with friends"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gold text-forest"><Icon name="check" className="h-3.5 w-3.5" /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-12 md:px-10">
        <div className="w-full max-w-lg">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="display mt-4 text-[clamp(2.2rem,5vw,3.4rem)] text-forest">{title}</h1>
          <p className="mt-3 text-base leading-relaxed text-charcoal/75">{intro}</p>
          <div className="mt-8 rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] md:p-8">{children}</div>
          <div className="mt-6 text-sm text-charcoal/80">{footer}</div>
        </div>
      </div>
    </section>
  );
}
