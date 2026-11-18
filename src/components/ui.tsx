import Link from "next/link";
import type { ReactNode } from "react";
import { DIETARY, SPICE_LABELS, formatPrice, type Range } from "@/lib/types";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type BtnVariant = "primary" | "gold" | "outline" | "outline-light" | "ghost" | "danger";
type BtnSize = "sm" | "md" | "lg";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide whitespace-nowrap select-none transition-[background-color,color,border-color,transform,box-shadow] duration-300 ease-[var(--ease-expo)] active:scale-[0.98] disabled:opacity-45 disabled:active:scale-100 disabled:pointer-events-none";
const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: "bg-forest text-cream hover:bg-forest-600 shadow-[0_10px_24px_-14px_rgba(15,36,24,0.8)]",
  gold: "bg-gold text-forest hover:bg-gold-soft shadow-[0_12px_30px_-14px_rgba(232,196,106,0.9)]",
  outline: "border border-forest/25 text-forest hover:border-forest hover:bg-forest hover:text-cream",
  "outline-light": "border border-cream/35 text-cream hover:border-gold hover:text-gold",
  ghost: "text-forest hover:bg-forest/5",
  danger: "border border-danger/30 text-danger hover:bg-danger hover:text-white",
};
const BTN_SIZES: Record<BtnSize, string> = {
  sm: "h-10 px-4 text-[0.8rem]",
  md: "h-12 px-6 text-sm",
  lg: "h-14 px-8 text-[0.95rem]",
};

export function btn(variant: BtnVariant = "primary", size: BtnSize = "md", extra = ""): string {
  return cx(BTN_BASE, BTN_VARIANTS[variant], BTN_SIZES[size], extra);
}

export const inputClass =
  "h-12 w-full rounded-xl border border-forest/20 bg-white px-4 text-[0.95rem] text-charcoal placeholder:text-charcoal/45 transition-colors hover:border-forest/40 focus:border-forest focus:outline-none focus:ring-2 focus:ring-gold/60 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-forest">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-charcoal/65">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
          <Icon name="alert" className="mt-0.5 h-4 w-4 flex-none" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const ICONS: Record<string, string> = {
  search: "M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM21 21l-4.3-4.3",
  user: "M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8z",
  bag: "M6 8h12l1 12H5L6 8zM9 8V6.5a3 3 0 0 1 6 0V8",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  "chevron-down": "M6 9l6 6l6-6",
  "chevron-right": "M9 6l6 6l-6 6",
  "chevron-left": "M15 6l-6 6l6 6",
  "arrow-right": "M5 12h14M13 6l6 6l-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  snowflake: "M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2L3.8 16.8M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5",
  drop: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z",
  truck: "M3 6h11v10H3zM14 9h4l3 3v4h-7M7.500 19a1.500 1.500 0 1 0 0-3a1.500 1.500 0 0 0 0 3zM17.500 19a1.500 1.500 0 1 0 0-3a1.500 1.500 0 0 0 0 3z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  clock: "M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM12 7v5l3 2",
  gift: "M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2 0-4-1-4-2.500S10 2 12 7zM12 7c2 0 4-1 4-2.500S14 2 12 7z",
  star: "M12 3l2.700 5.600l6.100.800l-4.500 4.300l1.100 6.100L12 16.900l-5.400 2.900l1.100-6.100L3.200 9.400l6.100-.800L12 3z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  pin: "M12 21s7-6.200 7-11.500a7 7 0 0 0-14 0C5 14.800 12 21 12 21zM12 12a2.500 2.500 0 1 0 0-5a2.500 2.500 0 0 0 0 5z",
  alert: "M12 3l9.500 17h-19L12 3zM12 10v4.500M12 17.500v.010",
  info: "M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM12 11v6M12 7.500v.010",
  lock: "M6 11h12v9H6zM8.500 11V8a3.500 3.500 0 0 1 7 0v3",
  eye: "M2 12s3.600-7 10-7s10 7 10 7s-3.600 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6z",
  "eye-off": "M2 12s3.600-7 10-7s10 7 10 7s-3.600 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM4 4l16 16",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  filter: "M4 6h16M7 12h10M10 18h4",
  flame: "M12 3c1 3.500 5 5.500 5 10a5 5 0 0 1-10 0c0-2 1-3.500 2-4.500c.300 1.600 1 2.500 2 3c-.500-3 0-6 1-8.500z",
  box: "M3.500 8L12 3.500L20.500 8v8L12 20.500L3.500 16V8zM3.500 8l8.500 4.500L20.500 8M12 12.500v8",
  mail: "M3 6h18v12H3zM3 7l9 6.500L21 7",
  phone: "M5 4h4l2 5l-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z",
  logout: "M9 4H5v16h4M15 8l4 4l-4 4M19 12H9",
  home: "M4 11l8-7l8 7v9h-5v-6H9v6H4v-9z",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  refresh: "M20 11a8 8 0 0 0-14.300-4.300L4 8.500M4 4v4.500h4.500M4 13a8 8 0 0 0 14.300 4.300L20 15.500M20 20v-4.500h-4.500",
  sparkle: "M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800L12 3z",
  users: "M16 20a6 6 0 0 0-12 0M10 11a3.500 3.500 0 1 0 0-7a3.500 3.500 0 0 0 0 7zM21 20a5 5 0 0 0-4-4.900M15.500 4.300a3.500 3.500 0 0 1 0 6.400",
  tag: "M3 12V4h8l10 10l-8 8L3 12zM7.500 8.500v.010",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 21h4",
  list: "M8 6h12M8 12h12M8 18h12M4 6v.010M4 12v.010M4 18v.010",
  shield: "M12 3l8 3v6c0 5-3.500 8-8 9c-4.500-1-8-4-8-9V6l8-3zM8.500 12l2.500 2.500l4.500-5",
};

export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={ICONS[name] ?? ICONS.info} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

/** Stand-in wordmark. Replace with the supplied Curry Crafted logo artwork when the file is available. */
export function Logo({ tone = "light", compact = false }: { tone?: "light" | "dark"; compact?: boolean }) {
  const text = tone === "light" ? "text-cream" : "text-forest";
  return (
    <span className="inline-flex items-center gap-2.5 md:gap-3">
      <svg viewBox="0 0 48 48" className={cx("flex-none transition-all duration-500", compact ? "h-9 w-9" : "h-9 w-9 md:h-11 md:w-11")} aria-hidden="true">
        <circle cx="24" cy="24" r="22.5" fill="none" stroke="#E8C46A" strokeWidth="1" />
        <circle cx="24" cy="24" r="19" fill="none" stroke="#E8C46A" strokeWidth="0.5" opacity="0.55" />
        <path d="M12.500 25.500h23a11.500 11.500 0 0 1-23 0z" fill="#E8C46A" />
        <path d="M10.500 25.500h27" stroke="#E8C46A" strokeWidth="1.400" strokeLinecap="round" />
        <path d="M19 20.500c-1.600-1.800 1.600-3.200 0-5M24 20.500c-1.600-2.200 1.600-4 0-6.500M29 20.500c-1.600-1.800 1.600-3.200 0-5" fill="none" stroke="#E8C46A" strokeWidth="1.200" strokeLinecap="round" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className={cx("display font-medium tracking-tight transition-all duration-500", text, compact ? "text-[1.15rem]" : "text-[1.15rem] md:text-[1.35rem]")}>
          Curry <em className="font-normal text-gold-muted">Crafted</em>
        </span>
        <span className={cx("mt-1 text-[0.56rem] font-bold uppercase tracking-[0.34em]", tone === "light" ? "text-cream/60" : "text-forest/60")}>Chilled &amp; Frozen</span>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Product metadata                                                    */
/* ------------------------------------------------------------------ */

export function RangeBadge({ range, size = "md", className }: { range: Range; size?: "sm" | "md"; className?: string }) {
  const chilled = range === "chilled";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-[0.14em]",
        size === "sm" ? "px-2.5 py-1 text-[0.6rem]" : "px-3 py-1.5 text-[0.66rem]",
        chilled ? "bg-sage text-forest ring-1 ring-forest/15" : "bg-forest text-cream ring-1 ring-gold/50",
        className,
      )}
    >
      <Icon name={chilled ? "drop" : "snowflake"} className={cx("h-3 w-3", !chilled && "text-gold")} />
      {chilled ? "Chilled" : "Frozen"}
    </span>
  );
}

export function Price({ pence, from = false, className }: { pence: number; from?: boolean; className?: string }) {
  return (
    <span className={cx("font-semibold tabular-nums text-forest", className)}>
      {from && <span className="mr-1 text-[0.7em] font-medium uppercase tracking-wider text-charcoal/60">from</span>}
      {formatPrice(pence)}
    </span>
  );
}

export function SpiceLevel({ level, tone = "dark", showLabel = true }: { level: number; tone?: "dark" | "light"; showLabel?: boolean }) {
  const label = SPICE_LABELS[level] ?? "Mild";
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-xs font-medium", tone === "dark" ? "text-charcoal/75" : "text-cream/80")} title={`Spice level: ${label}`}>
      <span className="flex items-center" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <Icon key={i} name="flame" className={cx("h-3.5 w-3.5", i <= level ? (tone === "dark" ? "text-forest" : "text-gold") : tone === "dark" ? "text-forest/20" : "text-cream/25")} />
        ))}
      </span>
      {showLabel ? label : <span className="sr-only">{label}</span>}
    </span>
  );
}

export function DietaryTags({ dietary, className }: { dietary: string[]; className?: string }) {
  // Vegan implies vegetarian, so only the most specific tag is shown.
  const shown = dietary.filter((d) => DIETARY[d] && !(d === "vegetarian" && dietary.includes("vegan")));
  if (!shown.length) return null;
  return (
    <span className={cx("inline-flex flex-wrap gap-1.5", className)}>
      {shown.map((d) => (
        <span key={d} className="inline-flex items-center rounded-full border border-forest/20 bg-white px-2.5 py-0.5 text-[0.68rem] font-semibold text-forest">
          {DIETARY[d].label}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Layout helpers                                                      */
/* ------------------------------------------------------------------ */

export function Eyebrow({ children, tone = "dark", className }: { children: ReactNode; tone?: "dark" | "light"; className?: string }) {
  return (
    <p className={cx("eyebrow flex items-center gap-3", tone === "dark" ? "text-forest/70" : "text-gold", className)}>
      <span className={cx("h-px w-8", tone === "dark" ? "bg-gold-muted" : "bg-gold/60")} aria-hidden="true" />
      {children}
    </p>
  );
}

export function Breadcrumbs({ items, tone = "dark" }: { items: { label: string; href?: string }[]; tone?: "dark" | "light" }) {
  const base = tone === "dark" ? "text-charcoal/65" : "text-cream/65";
  const link = tone === "dark" ? "hover:text-forest" : "hover:text-gold";
  return (
    <nav aria-label="Breadcrumb" className={cx("text-xs font-medium", base)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <Icon name="chevron-right" className="h-3 w-3 opacity-60" />}
            {item.href ? (
              <Link href={item.href} className={cx("underline-offset-4 transition-colors hover:underline", link)}>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className={tone === "dark" ? "text-forest" : "text-cream"}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Marks sample content that must be replaced with verified business data. */
export function SampleNote({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <p className={cx("flex items-start gap-2 rounded-xl border border-gold-muted/50 bg-gold/15 px-3.5 py-2.5 text-xs leading-relaxed text-charcoal", className)}>
      <Icon name="info" className="mt-0.5 h-4 w-4 flex-none text-gold-deep" />
      <span>{children ?? "Sample information for this preview. To be replaced with verified Curry Crafted data before launch."}</span>
    </p>
  );
}

export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "success" | "error"; title?: string; children?: ReactNode; className?: string }) {
  const tones = {
    info: "border-forest/15 bg-sage text-forest",
    success: "border-forest/20 bg-sage text-forest",
    error: "border-danger/30 bg-danger-soft text-danger",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm leading-relaxed", tones[tone], className)}>
      <Icon name={tone === "error" ? "alert" : tone === "success" ? "check" : "info"} className="mt-0.5 h-5 w-5 flex-none" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cx(title && "mt-0.5", tone === "error" ? "text-danger" : "text-charcoal/85")}>{children}</div>}
      </div>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  intro,
  crumbs,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  crumbs?: { label: string; href?: string }[];
  children?: ReactNode;
}) {
  return (
    <section className="on-dark relative overflow-hidden bg-forest text-cream">
      <div className="grain absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="container-x relative py-14 md:py-20">
        {crumbs && <Breadcrumbs items={crumbs} tone="light" />}
        {eyebrow && (
          <Eyebrow tone="light" className="mt-8">
            {eyebrow}
          </Eyebrow>
        )}
        <h1 className="display mt-4 max-w-4xl text-[clamp(2.4rem,6vw,4.5rem)] text-cream">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-base leading-relaxed text-cream/80 md:text-lg">{intro}</p>}
        {children}
      </div>
    </section>
  );
}
