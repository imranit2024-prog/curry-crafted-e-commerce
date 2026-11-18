"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductDTO } from "@/lib/types";
import { Reveal } from "./client-ui";
import { useStore } from "./store";
import { DietaryTags, Icon, Price, RangeBadge, SpiceLevel, btn, cx } from "./ui";

/** Add-to-basket control with every state: default, added, needs postcode, not deliverable, unavailable. */
export function AddButton({
  product,
  variantId,
  qty = 1,
  size = "sm",
  label = "Quick add",
  openDrawer = false,
  className,
  variant = "primary",
}: {
  product: ProductDTO;
  variantId?: string;
  qty?: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  openDrawer?: boolean;
  className?: string;
  variant?: "primary" | "gold";
}) {
  const { addProduct, postcode } = useStore();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1600);
    return () => window.clearTimeout(t);
  }, [added]);

  if (!product.available) {
    return (
      <button type="button" disabled className={btn("outline", size, className)}>
        Currently unavailable
      </button>
    );
  }
  const undeliverable = postcode && (product.range === "chilled" ? !postcode.chilled : !postcode.frozen);
  if (undeliverable) {
    return (
      <button type="button" disabled title={`${product.range === "chilled" ? "Chilled" : "Frozen"} delivery isn't available for ${postcode.postcode}`} className={btn("outline", size, className)}>
        Not available in {postcode.outward}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        const result = addProduct(product, { variantId, qty, openDrawer });
        if (result === "added") setAdded(true);
      }}
      aria-label={`${label}: ${product.name}`}
      className={btn(added ? "gold" : variant, size, cx("min-w-[7.5rem]", className))}
    >
      {added ? (
        <>
          <span className="pop inline-flex">
            <Icon name="check" className="h-4 w-4" />
          </span>
          Added
        </>
      ) : (
        <>
          <Icon name="plus" className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
}

export function ProductCard({ product, index = 0, priority = false }: { product: ProductDTO; index?: number; priority?: boolean }) {
  const href = `/products/${product.slug}`;
  const multi = product.variants.length > 1;
  return (
    <Reveal as="article" delay={(index % 4) * 80} className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-500 ease-[var(--ease-expo)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <Link href={href} className="relative block aspect-[4/3.4] overflow-hidden bg-forest" tabIndex={-1} aria-hidden="true">
        <Image
          src={product.image}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, (min-width: 480px) 50vw, 100vw"
          className={cx("object-cover transition-transform duration-[1200ms] ease-[var(--ease-expo)] group-hover:scale-[1.08]", !product.available && "opacity-60 grayscale")}
        />
        <span className="absolute inset-0 bg-gradient-to-t from-forest/55 via-transparent to-forest/10" />
        <span className="absolute inset-x-4 bottom-3 flex translate-y-2 items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-cream opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          View details <Icon name="arrow-right" className="h-4 w-4 text-gold" />
        </span>
      </Link>
      <RangeBadge range={product.range} className="absolute left-3 top-3 shadow-sm" />
      {!product.available && <span className="absolute right-3 top-3 rounded-full bg-charcoal px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-cream">Unavailable</span>}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <SpiceLevel level={product.spiceLevel} />
          <DietaryTags dietary={product.dietary} />
        </div>
        <h3 className="display mt-3 text-[1.45rem] text-forest">
          <Link href={href} className="underline-offset-4 hover:underline">
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-charcoal/75">{product.shortDescription}</p>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <Price pence={product.pricePence} from={multi} className="text-lg" />
            <p className="text-xs text-charcoal/60">{product.variants[0]?.label}</p>
          </div>
          <AddButton product={product} />
        </div>
        <Link href={href} className="mt-4 inline-flex items-center gap-1.5 self-start border-t border-forest/10 pt-3 text-xs font-semibold uppercase tracking-[0.16em] text-forest underline-offset-4 hover:underline">
          View details <span className="sr-only">for {product.name}</span>
          <Icon name="arrow-right" className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Reveal>
  );
}
