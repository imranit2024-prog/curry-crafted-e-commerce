"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, DIETARY, SPICE_LABELS, formatPrice, type ProductDTO, type Range } from "@/lib/types";
import { ProductCard } from "./product-card";
import { useStore } from "./store";
import { Icon, Notice, btn, cx, inputClass } from "./ui";

type Sort = "popular" | "newest" | "price-asc" | "price-desc";
const PAGE = 9;

function matches(p: ProductDTO, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const hay = `${p.name} ${p.category} ${p.range} ${p.shortDescription} ${p.description} ${p.dietary.join(" ")} ${p.ingredients}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

export function Catalogue({
  products,
  lockedRange,
  initialCategory = "all",
  initialQuery = "",
  initialRange = "all",
  searchMode = false,
}: {
  products: ProductDTO[];
  lockedRange?: Range;
  initialCategory?: string;
  initialQuery?: string;
  initialRange?: Range | "all";
  searchMode?: boolean;
}) {
  const { postcode } = useStore();
  const base = useMemo(() => (lockedRange ? products.filter((p) => p.range === lockedRange) : products), [products, lockedRange]);
  const prices = base.map((p) => p.pricePence);
  const maxPrice = Math.ceil(Math.max(100, ...prices) / 100) * 100;
  const minPrice = Math.floor(Math.min(maxPrice, ...prices) / 100) * 100;

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(CATEGORIES.some((c) => c.id === initialCategory) ? initialCategory : "all");
  const [range, setRange] = useState<Range | "all">(lockedRange ?? initialRange);
  const [dietary, setDietary] = useState<string[]>([]);
  const [spice, setSpice] = useState<number[]>([]);
  const [priceCap, setPriceCap] = useState(maxPrice);
  const [sort, setSort] = useState<Sort>("popular");
  const [visible, setVisible] = useState(PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categories = CATEGORIES.filter((c) => base.some((p) => p.category === c.id));
  const dietaryOptions = Object.keys(DIETARY).filter((d) => base.some((p) => p.dietary.includes(d)));

  const filtered = useMemo(() => {
    const list = base.filter(
      (p) =>
        matches(p, query) &&
        (category === "all" || p.category === category) &&
        (range === "all" || p.range === range) &&
        dietary.every((d) => p.dietary.includes(d)) &&
        (spice.length === 0 || spice.includes(p.spiceLevel)) &&
        p.pricePence <= priceCap,
    );
    const sorters: Record<Sort, (a: ProductDTO, b: ProductDTO) => number> = {
      popular: (a, b) => b.popularity - a.popularity,
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      "price-asc": (a, b) => a.pricePence - b.pricePence,
      "price-desc": (a, b) => b.pricePence - a.pricePence,
    };
    return [...list].sort(sorters[sort]);
  }, [base, query, category, range, dietary, spice, priceCap, sort]);

  const activeCount = (lockedRange || range === "all" ? 0 : 1) + dietary.length + spice.length + (priceCap < maxPrice ? 1 : 0);
  const anyActive = activeCount > 0 || category !== "all" || query.trim() !== "";
  const reset = () => {
    setQuery("");
    setCategory("all");
    setRange(lockedRange ?? "all");
    setDietary([]);
    setSpice([]);
    setPriceCap(maxPrice);
    setVisible(PAGE);
  };
  const toggle = <T,>(list: T[], item: T): T[] => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const change = (fn: () => void) => {
    fn();
    setVisible(PAGE);
  };

  const shown = filtered.slice(0, visible);
  const chilledBlocked = postcode && !postcode.chilled && (lockedRange === "chilled" || range === "chilled");

  const check = "h-5 w-5 flex-none rounded border-forest/30 accent-[#0F2418]";
  const filterPanel = (
    <div className="space-y-7">
      {!lockedRange && (
        <fieldset>
          <legend className="eyebrow text-forest/70">Range</legend>
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-forest/5 p-1">
            {(["all", "chilled", "frozen"] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => change(() => setRange(r))}
                className={cx("h-10 rounded-full text-sm font-semibold capitalize transition-colors", range === r ? "bg-forest text-cream" : "text-forest hover:bg-forest/10")}
              >
                {r}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {dietaryOptions.length > 0 && (
        <fieldset>
          <legend className="eyebrow text-forest/70">Dietary</legend>
          <div className="mt-3 space-y-1">
            {dietaryOptions.map((d) => (
              <label key={d} className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-medium text-charcoal hover:bg-forest/5">
                <input type="checkbox" className={check} checked={dietary.includes(d)} onChange={() => change(() => setDietary((l) => toggle(l, d)))} />
                {DIETARY[d].label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="eyebrow text-forest/70">Spice level</legend>
        <div className="mt-3 space-y-1">
          {SPICE_LABELS.map((label, level) => (
            <label key={label} className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-medium text-charcoal hover:bg-forest/5">
              <input type="checkbox" className={check} checked={spice.includes(level)} onChange={() => change(() => setSpice((l) => toggle(l, level)))} />
              <span className="flex-1">{label}</span>
              <span className="flex" aria-hidden="true">
                {[1, 2, 3].map((i) => (
                  <Icon key={i} name="flame" className={cx("h-3.5 w-3.5", i <= level ? "text-forest" : "text-forest/20")} />
                ))}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="eyebrow text-forest/70">Price</legend>
        <label htmlFor="price-cap" className="mt-3 flex items-center justify-between text-sm font-medium text-charcoal">
          <span>Up to</span>
          <span className="font-bold tabular-nums text-forest">{formatPrice(priceCap)}</span>
        </label>
        <input
          id="price-cap"
          type="range"
          min={minPrice}
          max={maxPrice}
          step={50}
          value={priceCap}
          onChange={(e) => change(() => setPriceCap(Number(e.target.value)))}
          className="mt-2 h-6 w-full accent-[#0F2418]"
        />
        <div className="flex justify-between text-xs tabular-nums text-charcoal/60">
          <span>{formatPrice(minPrice)}</span>
          <span>{formatPrice(maxPrice)}</span>
        </div>
      </fieldset>
      {anyActive && (
        <button type="button" onClick={reset} className={btn("outline", "sm", "w-full")}>
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-forest/60" />
          <label htmlFor="catalogue-search" className="sr-only">
            Search products
          </label>
          <input
            id="catalogue-search"
            type="search"
            value={query}
            onChange={(e) => change(() => setQuery(e.target.value))}
            placeholder={searchMode ? "Search by dish, ingredient or category" : "Search this collection"}
            autoComplete="off"
            className={cx(inputClass, "h-12 rounded-full pl-12 pr-11")}
          />
          {query && (
            <button type="button" onClick={() => change(() => setQuery(""))} aria-label="Clear search" className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full text-forest/70 hover:bg-forest/10">
              <Icon name="close" className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} aria-controls="filter-panel" className={btn("outline", "md", "flex-none lg:hidden")}>
            <Icon name="filter" className="h-4 w-4" /> Filters{activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1 text-[0.68rem] text-cream">{activeCount}</span>}
          </button>
          <div className="relative flex-1 md:flex-none">
            <label htmlFor="catalogue-sort" className="sr-only">
              Sort products
            </label>
            <select id="catalogue-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={cx(inputClass, "h-12 appearance-none rounded-full pr-10 text-sm font-semibold text-forest md:w-60")}>
              <option value="popular">Sort: Popular</option>
              <option value="newest">Sort: Newest</option>
              <option value="price-asc">Sort: Price low to high</option>
              <option value="price-desc">Sort: Price high to low</option>
            </select>
            <Icon name="chevron-down" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-forest" />
          </div>
        </div>
      </div>

      {/* Category navigation */}
      <nav aria-label="Product categories" className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {[{ id: "all", label: "All dishes" }, ...categories].map((c) => {
          const active = category === c.id;
          const n = c.id === "all" ? base.length : base.filter((p) => p.category === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={active}
              onClick={() => change(() => setCategory(c.id))}
              className={cx(
                "flex h-11 flex-none items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all duration-300",
                active ? "border-forest bg-forest text-cream" : "border-forest/15 bg-white text-forest hover:border-forest/50",
              )}
            >
              {c.label}
              <span className={cx("text-xs tabular-nums", active ? "text-gold" : "text-charcoal/55")}>{n}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-8 grid gap-8 lg:grid-cols-[15.5rem_1fr] lg:gap-10">
        <aside id="filter-panel" aria-label="Filters" className={cx("lg:block", filtersOpen ? "block" : "hidden")}>
          <div className="rounded-3xl border border-forest/10 bg-white p-5 lg:sticky lg:top-24">{filterPanel}</div>
        </aside>

        <div>
          {chilledBlocked && (
            <Notice tone="error" title={`Chilled delivery isn't available for ${postcode.postcode}`} className="mb-6">
              You can still browse our chilled dishes, but they can&apos;t be added to your basket for this postcode.{" "}
              <Link href="/frozen" className="font-semibold text-forest underline underline-offset-4">
                Shop the frozen range, delivered UK-wide
              </Link>
              .
            </Notice>
          )}
          <p className="mb-5 text-sm font-medium text-charcoal/70" aria-live="polite">
            {filtered.length === 0 ? "No dishes found" : `Showing ${shown.length} of ${filtered.length} dish${filtered.length === 1 ? "" : "es"}`}
            {query.trim() && <> for “{query.trim()}”</>}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-forest/20 bg-white px-6 py-16 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage text-forest">
                <Icon name="search" className="h-7 w-7" />
              </span>
              <p className="display mt-5 text-3xl text-forest">No dishes match your selection</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-charcoal/70">Try a different search term, or remove a filter or two to see more of the menu.</p>
              <button type="button" onClick={reset} className={btn("primary", "md", "mt-6")}>
                Clear search and filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} priority={i < 3} />
                ))}
              </div>
              {visible < filtered.length && (
                <div className="mt-10 text-center">
                  <button type="button" onClick={() => setVisible((v) => v + PAGE)} className={btn("outline", "lg")}>
                    Load more <span className="text-charcoal/60">({filtered.length - visible} remaining)</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
