"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon, Logo, cx } from "./ui";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All products" },
      { href: "/chilled", label: "Chilled collection" },
      { href: "/frozen", label: "Frozen collection" },
      { href: "/bundles", label: "Meal bundles" },
      { href: "/search", label: "Search the menu" },
    ],
  },
  {
    title: "Curry Crafted",
    links: [
      { href: "/our-story", label: "About us" },
      { href: "/contact", label: "Contact us" },
      { href: "/account/rewards", label: "Rewards" },
      { href: "/account/refer", label: "Refer a friend" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/delivery", label: "Delivery information" },
      { href: "/faqs", label: "FAQs" },
      { href: "/food-information", label: "Allergen information" },
      { href: "/legal/returns", label: "Returns & cancellation" },
    ],
  },
];

const LEGAL = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms & Conditions" },
  { href: "/legal/returns", label: "Returns / Cancellation Policy" },
  { href: "/legal/cookies", label: "Cookie Policy" },
];

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "loading") return;
    setError(null);
    if (!email.trim()) return setError("Enter your email address.");
    if (!consent) return setError("Please tick the box to confirm you'd like our emails.");
    setState("loading");
    try {
      const res = await fetch("/api/forms/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, consent }) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setError("We couldn't reach the server. Please try again.");
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <p role="status" className="flex items-start gap-3 rounded-2xl border border-gold/30 bg-cream/5 p-4 text-sm text-cream">
        <span className="pop grid h-7 w-7 flex-none place-items-center rounded-full bg-gold text-forest">
          <Icon name="check" className="h-4 w-4" />
        </span>
        You&apos;re on the list. You can unsubscribe at any time using the link in our emails.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex rounded-full border border-cream/25 bg-cream/5 p-1 focus-within:border-gold">
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "newsletter-error" : undefined}
          className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-cream placeholder:text-cream/45 focus:outline-none"
        />
        <button type="submit" disabled={state === "loading"} className="flex h-11 flex-none items-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-forest transition-colors hover:bg-gold-soft disabled:opacity-60">
          {state === "loading" ? <span className="spinner" /> : "Subscribe"}
        </button>
      </div>
      <label className="mt-3 flex items-start gap-2.5 text-xs leading-relaxed text-cream/70">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-[#E8C46A]" />
        <span>
          Yes, email me Curry Crafted news and offers. See our{" "}
          <Link href="/legal/privacy" className="text-cream underline underline-offset-2 hover:text-gold">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {error && (
        <p id="newsletter-error" role="alert" className="mt-2 text-xs font-semibold text-gold-soft">
          {error}
        </p>
      )}
    </form>
  );
}

export function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  if (pathname === "/checkout") {
    return (
      <footer className="border-t border-forest/10 bg-cream py-6">
        <div className="container-x flex flex-wrap items-center justify-between gap-3 text-xs text-charcoal/70">
          <p>© {year} Curry Crafted</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="underline-offset-4 hover:text-forest hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    );
  }

  return (
    <footer className="on-dark relative overflow-hidden bg-forest pb-24 text-cream md:pb-0">
      <div className="grain absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="container-x relative py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href="/" aria-label="Curry Crafted home" className="inline-block">
              <Logo />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream/75">
              Handcrafted chilled meals and frozen favourites, cooked in small batches and delivered to your door. Order ahead, choose your day, and enjoy real flavour whenever you&apos;re ready.
            </p>
            <div className="mt-8 max-w-sm">
              <p className="eyebrow mb-3 text-gold">Join our newsletter</p>
              <NewsletterForm />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7 lg:col-start-6">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <p className="eyebrow text-gold">{col.title}</p>
                <ul className="mt-4 space-y-1">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className={cx("inline-block py-1.5 text-sm text-cream/80 underline-offset-4 transition-colors hover:text-gold hover:underline")}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <div className="col-span-2 sm:col-span-3">
              <p className="eyebrow text-gold">Follow us</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {["Instagram", "Facebook", "TikTok"].map((s) => (
                  <li key={s}>
                    <span title="Profile link to be supplied by Curry Crafted" className="inline-flex items-center gap-2 rounded-full border border-dashed border-cream/25 px-4 py-2 text-xs font-medium text-cream/60">
                      {s} <span className="text-[0.6rem] uppercase tracking-widest text-cream/45">link pending</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="gold-rule mt-14 opacity-50" />
        <div className="mt-6 flex flex-col gap-4 text-xs text-cream/60 md:flex-row md:items-center md:justify-between">
          <p>© {year} Curry Crafted. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="underline-offset-4 hover:text-gold hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 rounded-xl border border-cream/10 bg-cream/5 px-4 py-3 text-[0.72rem] leading-relaxed text-cream/60">
          Preview build: menu items, prices, food information, delivery coverage, charges, time slots and reward rates shown on this site are placeholders and will be replaced with confirmed Curry Crafted data before launch.
        </p>
      </div>
    </footer>
  );
}
