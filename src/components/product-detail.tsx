"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatPrice, type ProductDTO } from "@/lib/types";
import { QuantitySelector } from "./client-ui";
import { AddButton } from "./product-card";
import { useStore } from "./store";
import { Icon, RangeBadge, btn, cx } from "./ui";

export function Gallery({ images, name, available }: { images: string[]; name: string; available: boolean }) {
  const [active, setActive] = useState(0);
  const labels = ["Full dish", "Close-up"];
  return (
    <div className="lg:sticky lg:top-24">
      <div className="group relative aspect-square overflow-hidden rounded-[2rem] bg-forest">
        {images.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={i === active ? `${name}: ${labels[i]?.toLowerCase() ?? `view ${i + 1}`}` : ""}
            fill
            priority={i === 0}
            sizes="(min-width: 1024px) 46vw, 100vw"
            className={cx("object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-expo)] group-hover:scale-[1.04]", i === active ? "opacity-100" : "opacity-0", !available && "grayscale")}
          />
        ))}
        {!available && <span className="absolute left-5 top-5 rounded-full bg-charcoal px-4 py-2 text-xs font-bold uppercase tracking-wider text-cream">Currently unavailable</span>}
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex gap-3" role="group" aria-label="Product images">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show ${labels[i]?.toLowerCase() ?? `image ${i + 1}`}`}
              aria-pressed={i === active}
              className={cx("relative h-20 w-20 overflow-hidden rounded-2xl bg-forest ring-2 ring-offset-2 ring-offset-cream transition-all", i === active ? "ring-forest" : "opacity-70 ring-transparent hover:opacity-100")}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DeliveryBlock({ product }: { product: ProductDTO }) {
  const { postcode, requestPostcode } = useStore();
  if (product.range === "chilled") {
    const state = !postcode ? "unknown" : postcode.chilled ? "yes" : "no";
    return (
      <div className={cx("rounded-2xl border p-5", state === "no" ? "border-danger/25 bg-danger-soft" : "border-forest/10 bg-sage")} aria-live="polite">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-forest text-gold">
            <Icon name={state === "yes" ? "check" : state === "no" ? "close" : "pin"} className="h-4 w-4" />
          </span>
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-forest">
              {state === "unknown" && "Chilled delivery: selected postcodes only"}
              {state === "yes" && `Chilled delivery available for ${postcode!.postcode}`}
              {state === "no" && `Chilled delivery isn't available for ${postcode!.postcode}`}
            </p>
            <p className="mt-1 text-charcoal/80">
              {state === "unknown" && "We'll confirm your postcode before this dish goes in your basket. You choose the delivery day and time slot at checkout."}
              {state === "yes" && "Delivered by our refrigerated service on the day and time slot you choose at checkout."}
              {state === "no" && "This dish can't be delivered to your postcode. Our frozen range is delivered UK-wide and uses the same recipes."}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              <button type="button" onClick={() => requestPostcode()} className="font-semibold text-forest underline underline-offset-4">
                {postcode ? "Change postcode" : "Check your postcode"}
              </button>
              {state === "no" && (
                <Link href="/frozen" className="font-semibold text-forest underline underline-offset-4">
                  Shop frozen instead
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  const blocked = postcode && !postcode.frozen;
  return (
    <div className={cx("rounded-2xl border p-5", blocked ? "border-danger/25 bg-danger-soft" : "border-forest/10 bg-sage")} aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-forest text-gold">
          <Icon name={blocked ? "close" : "truck"} className="h-4 w-4" />
        </span>
        <div className="text-sm leading-relaxed">
          <p className="font-semibold text-forest">{blocked ? `Frozen delivery isn't available for ${postcode.postcode}` : postcode ? `Frozen delivery available for ${postcode.postcode}` : "Frozen delivery: UK-wide"}</p>
          <p className="mt-1 text-charcoal/80">
            {blocked
              ? (postcode.frozenNote ?? "This postcode is outside our courier coverage.")
              : `Sent by tracked courier in insulated packaging. No delivery slot needed.${postcode?.frozenSurchargePence ? ` ${postcode.frozenNote ?? ""} A ${formatPrice(postcode.frozenSurchargePence)} surcharge applies to your postcode.` : " A few remote postcodes carry a surcharge, shown before you pay."}`}
          </p>
          <Link href="/delivery" className="mt-3 inline-block font-semibold text-forest underline underline-offset-4">
            Delivery information
          </Link>
        </div>
      </div>
    </div>
  );
}

export function PurchasePanel({ product }: { product: ProductDTO }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const total = (variant?.pricePence ?? 0) * qty;

  return (
    <div>
      <p className="flex items-baseline gap-3">
        <span className="text-3xl font-bold tabular-nums text-forest">{formatPrice(variant?.pricePence ?? 0)}</span>
        <span className="text-sm text-charcoal/65">{variant?.label}</span>
      </p>

      {product.variants.length > 1 && (
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-forest">Choose a size</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {product.variants.map((v) => {
              const active = v.id === variantId;
              return (
                <label
                  key={v.id}
                  className={cx(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold",
                    active ? "border-forest bg-forest text-cream" : "border-forest/15 bg-white text-forest hover:border-forest/50",
                  )}
                >
                  <input type="radio" name="variant" value={v.id} checked={active} onChange={() => setVariantId(v.id)} className="sr-only" />
                  <span className="flex items-center gap-2.5 text-sm font-semibold">
                    <span className={cx("grid h-5 w-5 place-items-center rounded-full border", active ? "border-gold bg-gold text-forest" : "border-forest/30")}>{active && <Icon name="check" className="h-3 w-3" />}</span>
                    {v.label}
                  </span>
                  <span className="text-sm font-bold tabular-nums">{formatPrice(v.pricePence)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <QuantitySelector value={qty} onChange={setQty} max={product.maxPerOrder} disabled={!product.available} />
        <AddButton product={product} variantId={variantId} qty={qty} size="lg" label={`Add to Basket · ${formatPrice(total)}`} openDrawer className="flex-1" />
      </div>
      <p className="mt-3 text-xs text-charcoal/60">Maximum {product.maxPerOrder} per order.</p>

      <div className="mt-6">
        <DeliveryBlock product={product} />
      </div>

      {/* Sticky add-to-basket on small screens */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-forest/10 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-forest">{product.name}</p>
            <p className="text-xs text-charcoal/65">
              {qty} × {variant?.label}
            </p>
          </div>
          <AddButton product={product} variantId={variantId} qty={qty} size="md" label={`Add · ${formatPrice(total)}`} openDrawer />
        </div>
      </div>
    </div>
  );
}

export function BoughtTogether({ product, companions }: { product: ProductDTO; companions: ProductDTO[] }) {
  const { addProducts, postcode } = useStore();
  const all = [product, ...companions];
  const [selected, setSelected] = useState<number[]>(all.filter((p) => p.available).map((p) => p.id));
  const chosen = all.filter((p) => selected.includes(p.id) && p.available);
  const total = chosen.reduce((s, p) => s + p.pricePence, 0);
  const undeliverable = postcode && (product.range === "chilled" ? !postcode.chilled : !postcode.frozen);

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-[var(--shadow-card)] md:p-9">
      <div className="grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-center">
        <ul className="grid gap-4 sm:grid-cols-3">
          {all.map((p, i) => {
            const on = selected.includes(p.id) && p.available;
            return (
              <li key={p.id} className="relative">
                {i > 0 && (
                  <span className="absolute -left-4 top-16 z-10 hidden h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-gold text-forest sm:grid" aria-hidden="true">
                    <Icon name="plus" className="h-4 w-4" />
                  </span>
                )}
                <label className={cx("flex cursor-pointer gap-4 rounded-2xl border p-3 transition-all duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold sm:flex-col", on ? "border-forest/30 bg-sage" : "border-forest/10 bg-white opacity-70", !p.available && "cursor-not-allowed")}>
                  <span className="relative block h-24 w-24 flex-none overflow-hidden rounded-xl bg-forest sm:aspect-[4/3] sm:h-auto sm:w-full">
                    <Image src={p.image} alt="" fill sizes="(min-width: 640px) 220px, 96px" className={cx("object-cover", !p.available && "grayscale")} />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={!p.available}
                        onChange={() => setSelected((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                        className="mt-0.5 h-5 w-5 flex-none accent-[#0F2418]"
                      />
                      <span className="text-sm font-semibold leading-snug text-forest">
                        {i === 0 && <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-charcoal/55">This dish</span>}
                        {p.name}
                      </span>
                    </span>
                    <span className="mt-2 flex items-center justify-between pl-7 text-sm">
                      <span className="font-bold tabular-nums text-forest">{formatPrice(p.pricePence)}</span>
                      {!p.available && <span className="text-xs text-charcoal/60">Unavailable</span>}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="rounded-2xl bg-forest p-6 text-cream">
          <RangeBadge range={product.range} size="sm" />
          <p className="mt-4 text-sm text-cream/75">
            Total for {chosen.length} item{chosen.length === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums" aria-live="polite">
            {formatPrice(total)}
          </p>
          <button type="button" disabled={chosen.length === 0 || Boolean(undeliverable)} onClick={() => addProducts(chosen)} className={btn("gold", "md", "mt-5 w-full")}>
            {undeliverable ? `Not available in ${postcode.outward}` : "Add selected to basket"}
          </button>
        </div>
      </div>
    </div>
  );
}
