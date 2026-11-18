import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatPrice, type BundleDTO, type Range } from "@/lib/types";
import { Breadcrumbs, Eyebrow, Icon, RangeBadge, btn, cx } from "./ui";

export function bundleContents(b: Pick<BundleDTO, "mainsCount" | "sidesCount">): string {
  return `${b.mainsCount} main${b.mainsCount === 1 ? "" : "s"} + ${b.sidesCount} side${b.sidesCount === 1 ? "" : "s"}`;
}

export function BundleCard({ bundle, tone = "dark" }: { bundle: BundleDTO; tone?: "dark" | "light" }) {
  const dark = tone === "dark";
  return (
    <article
      className={cx(
        "group flex h-full flex-col overflow-hidden rounded-3xl border transition-[transform,border-color,box-shadow] duration-500 ease-[var(--ease-expo)] hover:-translate-y-1",
        dark ? "border-gold/20 bg-forest-800 hover:border-gold/60" : "border-forest/10 bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lift)]",
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-forest">
        <Image src={bundle.image} alt="" fill sizes="(min-width: 1024px) 400px, 100vw" className="object-cover transition-transform duration-[1400ms] ease-[var(--ease-expo)] group-hover:scale-[1.07]" />
        <span className="absolute inset-0 bg-gradient-to-t from-forest/80 via-forest/10 to-transparent" />
        <RangeBadge range={bundle.range} className="absolute left-4 top-4" />
        <span className="absolute bottom-4 left-4 rounded-full bg-cream/95 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-forest">{bundle.serves}</span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className={cx("display text-[1.7rem]", dark ? "text-cream" : "text-forest")}>{bundle.name}</h3>
        <p className={cx("mt-2 text-sm leading-relaxed", dark ? "text-cream/75" : "text-charcoal/75")}>{bundle.description}</p>
        <p className={cx("mt-4 flex items-center gap-2 text-sm font-semibold", dark ? "text-gold" : "text-forest")}>
          <Icon name="box" className="h-4 w-4" /> Includes {bundleContents(bundle)} of your choice
        </p>
        <div className="mt-5 flex flex-1 items-end justify-between gap-4">
          <div>
            <p className={cx("text-2xl font-bold tabular-nums", dark ? "text-cream" : "text-forest")}>{formatPrice(bundle.pricePence)}</p>
            {bundle.saveUpToPence > 0 && (
              <p className={cx("mt-0.5 text-xs font-medium", dark ? "text-cream/70" : "text-charcoal/70")}>
                Save up to <span className={dark ? "text-gold" : "font-bold text-forest"}>{formatPrice(bundle.saveUpToPence)}</span> vs buying separately
              </p>
            )}
          </div>
          <Link href={`/bundles?bundle=${bundle.slug}`} className={btn(dark ? "gold" : "primary", "sm", "flex-none")}>
            Build Your Bundle
          </Link>
        </div>
      </div>
    </article>
  );
}

export function CollectionBanner({
  range,
  title,
  intro,
  image,
  crumbs,
  points,
  children,
}: {
  range: Range;
  title: ReactNode;
  intro: string;
  image: string;
  crumbs: { label: string; href?: string }[];
  points: { icon: string; text: string }[];
  children?: ReactNode;
}) {
  return (
    <section className="on-dark relative overflow-hidden bg-forest text-cream">
      <div className="absolute inset-0 lg:left-[42%]">
        <Image src={image} alt="" fill priority sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover opacity-40 lg:opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/70 to-forest/40 lg:bg-gradient-to-r lg:from-forest lg:via-forest/40 lg:to-transparent" />
      </div>
      <div className="container-x relative py-12 md:py-20 lg:min-h-[30rem]">
        <Breadcrumbs items={crumbs} tone="light" />
        <div className="mt-10 max-w-xl">
          <RangeBadge range={range} />
          <h1 className="display mt-5 text-[clamp(2.6rem,6.5vw,5rem)] text-cream">{title}</h1>
          <p className="mt-5 text-base leading-relaxed text-cream/85 md:text-lg">{intro}</p>
          <ul className="mt-7 space-y-2.5">
            {points.map((p) => (
              <li key={p.text} className="flex items-start gap-3 text-sm text-cream/90">
                <Icon name={p.icon} className="mt-0.5 h-4 w-4 flex-none text-gold" />
                {p.text}
              </li>
            ))}
          </ul>
          {children}
        </div>
      </div>
    </section>
  );
}

export function InfoCard({ icon, title, children, tone = "light" }: { icon: string; title: string; children: ReactNode; tone?: "light" | "sage" }) {
  return (
    <div className={cx("h-full rounded-3xl border border-forest/10 p-6 md:p-7", tone === "light" ? "bg-white" : "bg-sage")}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-forest text-gold">
        <Icon name={icon} />
      </span>
      <h3 className="display mt-5 text-2xl text-forest">{title}</h3>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-charcoal/80">{children}</div>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  tone = "dark",
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  tone?: "dark" | "light";
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cx(align === "center" && "mx-auto text-center", "max-w-3xl", className)}>
      {eyebrow && (
        <Eyebrow tone={tone} className={align === "center" ? "justify-center" : undefined}>
          {eyebrow}
        </Eyebrow>
      )}
      <h2 className={cx("display mt-4 text-[clamp(2.1rem,4.6vw,3.75rem)]", tone === "dark" ? "text-forest" : "text-cream")}>{title}</h2>
      {intro && <p className={cx("mt-5 text-base leading-relaxed md:text-lg", tone === "dark" ? "text-charcoal/80" : "text-cream/80")}>{intro}</p>}
    </div>
  );
}
