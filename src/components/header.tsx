"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CATEGORIES, formatPrice, type Range } from "@/lib/types";
import { useDialog } from "./client-ui";
import { useStore } from "./store";
import { Icon, Logo, RangeBadge, btn, cx } from "./ui";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop", menu: true },
  { href: "/chilled", label: "Chilled" },
  { href: "/frozen", label: "Frozen" },
  { href: "/bundles", label: "Meal Bundles" },
  { href: "/our-story", label: "Our Story" },
];

type SearchHit = { slug: string; name: string; image: string; range: Range; category: string; pricePence: number; available: boolean };

function SearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const ref = useDialog(true, onClose);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const ctrl = new AbortController();
    setState("loading");
    const timer = window.setTimeout(
      async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: ctrl.signal });
          const data = await res.json();
          if (!res.ok) throw new Error();
          setHits(data.results);
          setTotal(data.total);
          setState("ready");
        } catch {
          if (!ctrl.signal.aborted) setState("error");
        }
      },
      query ? 180 : 0,
    );
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    onClose();
  };
  const q = query.trim();

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="fade-in absolute inset-0 bg-forest/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Search our menu" className="toast relative max-h-dvh overflow-y-auto bg-cream text-charcoal shadow-[var(--shadow-lift)]">
        <div className="container-x py-5 md:py-8">
          <form onSubmit={submit} role="search" className="flex items-center gap-3 border-b border-forest/20 pb-3">
            <Icon name="search" className="h-6 w-6 flex-none text-forest" />
            <label htmlFor="site-search" className="sr-only">
              Search dishes
            </label>
            <input
              id="site-search"
              data-autofocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search butter chicken, lamb, vegan…"
              autoComplete="off"
              className="display h-14 min-w-0 flex-1 bg-transparent text-2xl text-forest placeholder:text-forest/35 focus:outline-none md:text-4xl"
            />
            <button type="button" onClick={onClose} aria-label="Close search" className="grid h-11 w-11 flex-none place-items-center rounded-full text-forest hover:bg-forest/10">
              <Icon name="close" />
            </button>
          </form>

          <div className="py-5" aria-live="polite">
            <p className="eyebrow mb-4 text-forest/65">{q ? (state === "ready" ? `${total} result${total === 1 ? "" : "s"} for “${q}”` : "Searching…") : "Suggested dishes"}</p>
            {state === "error" && <p className="text-sm font-medium text-danger">Search is unavailable right now. Please try again.</p>}
            {state === "loading" && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-20" />
                ))}
              </div>
            )}
            {state === "ready" && hits.length === 0 && (
              <div className="rounded-2xl bg-white p-6 text-center">
                <p className="display text-2xl text-forest">Nothing matches “{q}”.</p>
                <p className="mt-2 text-sm text-charcoal/70">Try a dish name, an ingredient or a category such as chicken, lamb or vegetarian.</p>
                <Link href="/shop" onClick={onClose} className={btn("outline", "sm", "mt-4")}>
                  Browse the full menu
                </Link>
              </div>
            )}
            {state === "ready" && hits.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {hits.map((h) => (
                  <li key={h.slug}>
                    <Link href={`/products/${h.slug}`} onClick={onClose} className="group flex items-center gap-4 rounded-2xl bg-white p-2.5 pr-4 shadow-[var(--shadow-card)] transition-transform duration-300 hover:-translate-y-0.5">
                      <span className="relative h-16 w-16 flex-none overflow-hidden rounded-xl bg-forest">
                        <Image src={h.image} alt="" fill sizes="64px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-forest">{h.name}</span>
                        <span className="mt-1 flex items-center gap-2">
                          <RangeBadge range={h.range} size="sm" />
                          {!h.available && <span className="text-xs font-medium text-charcoal/60">Unavailable</span>}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums text-forest">{formatPrice(h.pricePence)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {q && state === "ready" && total > hits.length && (
              <button type="button" onClick={(e) => submit(e as unknown as FormEvent)} className={btn("primary", "sm", "mt-5")}>
                See all {total} results <Icon name="arrow-right" className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileNav({ onClose, pathname }: { onClose: () => void; pathname: string }) {
  const ref = useDialog(true, onClose);
  const { user, postcode, requestPostcode } = useStore();
  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div className="fade-in absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Menu" className="on-dark toast absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-y-auto bg-forest text-cream">
        <div className="flex items-center justify-between px-5 py-4">
          <Logo compact />
          <button type="button" onClick={onClose} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-full hover:bg-cream/10">
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label="Main" className="px-5 pb-4">
          <ul>
            {NAV.map((item, i) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href} className="fade-up border-b border-cream/10" style={{ ["--i" as string]: i * 0.4 - 2 }}>
                  <Link href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={cx("display flex items-center justify-between py-4 text-3xl", active ? "text-gold" : "text-cream")}>
                    {item.label}
                    <Icon name="arrow-right" className="h-5 w-5 opacity-60" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="eyebrow mt-6 text-gold">Shop by category</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Link key={c.id} href={`/shop?category=${c.id}`} onClick={onClose} className="rounded-full border border-cream/25 px-4 py-2.5 text-sm font-medium text-cream hover:border-gold hover:text-gold">
                {c.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="mt-auto space-y-3 border-t border-cream/10 p-5">
          <button
            type="button"
            onClick={() => {
              onClose();
              requestPostcode();
            }}
            className="flex w-full items-center gap-3 rounded-2xl bg-cream/5 px-4 py-3.5 text-left text-sm"
          >
            <Icon name="pin" className="h-5 w-5 flex-none text-gold" />
            <span className="flex-1">
              {postcode ? (
                <>
                  Delivering to <strong className="font-semibold text-gold">{postcode.postcode}</strong>
                </>
              ) : (
                "Check delivery to your postcode"
              )}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-cream/70">{postcode ? "Change" : "Check"}</span>
          </button>
          <Link href={user ? "/account" : "/login"} onClick={onClose} className={btn("gold", "md", "w-full")}>
            <Icon name="user" className="h-4 w-4" /> {user ? "My account" : "Sign in or register"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const { count, setDrawerOpen, bumpKey, user, postcode, requestPostcode, hydrated } = useStore();
  const [compact, setCompact] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setShopOpen(false);
    setSearchOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const openShop = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setShopOpen(true);
  };
  const closeShop = () => {
    closeTimer.current = window.setTimeout(() => setShopOpen(false), 140);
  };

  // Distraction-free header during checkout only; the confirmation page gets full navigation back.
  if (pathname === "/checkout") {
    return (
      <header className="on-dark sticky top-0 z-40 bg-forest text-cream">
        <div className="container-x flex h-16 items-center justify-between">
          <Link href="/" aria-label="Curry Crafted home">
            <Logo compact />
          </Link>
          <p className="hidden items-center gap-2 text-sm font-medium text-cream/80 sm:flex">
            <Icon name="lock" className="h-4 w-4 text-gold" /> Secure checkout
          </p>
          <Link href="/basket" className="text-sm font-semibold text-gold underline-offset-4 hover:underline">
            Back to basket
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className={cx("on-dark sticky top-0 z-40 bg-forest text-cream transition-shadow duration-500", compact && "shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]")}>
      {/* Delivery ribbon */}
      <div className={cx("overflow-hidden border-b border-cream/10 transition-[max-height,opacity] duration-500 ease-[var(--ease-expo)]", compact ? "max-h-0 opacity-0" : "max-h-12 opacity-100")}>
        <div className="container-x flex h-10 items-center justify-between gap-4 text-[0.72rem] font-medium tracking-wide text-cream/80">
          <p className="truncate">
            <span className="text-gold">Chilled</span> to selected postcodes <span className="mx-1.5 text-cream/30">·</span> <span className="text-gold">Frozen</span> delivered UK-wide
          </p>
          <button type="button" onClick={() => requestPostcode()} tabIndex={compact ? -1 : 0} className="flex flex-none items-center gap-1.5 font-semibold text-cream underline-offset-4 hover:text-gold hover:underline">
            <Icon name="pin" className="h-3.5 w-3.5 text-gold" />
            {postcode ? `Delivering to ${postcode.postcode}` : "Check your postcode"}
          </button>
        </div>
      </div>

      <div className={cx("container-x flex items-center justify-between gap-3 transition-[height] lg:gap-6 duration-500 ease-[var(--ease-expo)]", compact ? "h-16" : "h-20")}>
        <Link href="/" aria-label="Curry Crafted home" className="min-w-0">
          <Logo compact={compact} />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const linkClass = cx(
                "relative flex h-11 items-center gap-1 rounded-full px-4 text-[0.82rem] font-semibold tracking-wide transition-colors hover:text-gold",
                active ? "text-gold" : "text-cream/90",
                "after:absolute after:inset-x-4 after:bottom-1.5 after:h-px after:origin-left after:bg-gold after:transition-transform after:duration-500 after:ease-[var(--ease-expo)]",
                active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
              );
              if (!item.menu) {
                return (
                  <li key={item.href}>
                    <Link href={item.href} aria-current={active ? "page" : undefined} className={linkClass}>
                      {item.label}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={item.href} className="relative" onMouseEnter={openShop} onMouseLeave={closeShop}>
                  <div className="flex items-center">
                    <Link href={item.href} aria-current={active ? "page" : undefined} className={cx(linkClass, "pr-1")}>
                      {item.label}
                    </Link>
                    <button
                      type="button"
                      aria-expanded={shopOpen}
                      aria-controls="shop-menu"
                      aria-label="Shop categories"
                      onClick={() => setShopOpen((o) => !o)}
                      className="grid h-8 w-7 place-items-center rounded-full text-cream/80 hover:text-gold"
                    >
                      <Icon name="chevron-down" className={cx("h-3.5 w-3.5 transition-transform duration-300", shopOpen && "rotate-180")} />
                    </button>
                  </div>
                  <div
                    id="shop-menu"
                    className={cx(
                      "absolute left-1/2 top-full w-[34rem] -translate-x-1/2 pt-3 transition-[opacity,transform,visibility] duration-300 ease-[var(--ease-expo)]",
                      shopOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
                    )}
                  >
                    <div className="grid grid-cols-2 gap-6 rounded-3xl border border-gold/25 bg-forest-800 p-6 shadow-[var(--shadow-lift)]">
                      <div>
                        <p className="eyebrow text-gold">By category</p>
                        <ul className="mt-3 space-y-0.5">
                          {CATEGORIES.map((c) => (
                            <li key={c.id}>
                              <Link href={`/shop?category=${c.id}`} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-cream/90 hover:bg-cream/5 hover:text-gold">
                                {c.label} <Icon name="chevron-right" className="h-3.5 w-3.5 opacity-50" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <p className="eyebrow text-gold">By range</p>
                        <Link href="/chilled" className="block rounded-2xl bg-cream/5 p-4 hover:bg-cream/10">
                          <RangeBadge range="chilled" size="sm" />
                          <span className="mt-2 block text-sm text-cream/80">Fresh from our kitchen to selected postcodes.</span>
                        </Link>
                        <Link href="/frozen" className="block rounded-2xl bg-cream/5 p-4 hover:bg-cream/10">
                          <RangeBadge range="frozen" size="sm" />
                          <span className="mt-2 block text-sm text-cream/80">Frozen at their best, delivered UK-wide.</span>
                        </Link>
                        <Link href="/shop" className="flex items-center gap-2 px-1 text-sm font-semibold text-gold underline-offset-4 hover:underline">
                          View all products <Icon name="arrow-right" className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex flex-none items-center gap-0.5">
          <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search" className="grid h-11 w-11 place-items-center rounded-full text-cream transition-colors hover:bg-cream/10 hover:text-gold">
            <Icon name="search" />
          </button>
          <Link href={user ? "/account" : "/login"} aria-label={user ? "My account" : "Sign in"} className="relative hidden h-11 w-11 sm:grid place-items-center rounded-full text-cream transition-colors hover:bg-cream/10 hover:text-gold">
            <Icon name="user" />
            {user && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-gold ring-2 ring-forest" aria-hidden="true" />}
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={`Basket, ${hydrated ? count : 0} item${count === 1 ? "" : "s"}`}
            className="relative grid h-11 w-11 place-items-center rounded-full text-cream transition-colors hover:bg-cream/10 hover:text-gold"
          >
            <Icon name="bag" />
            {hydrated && count > 0 && (
              <span key={bumpKey} className="bump absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[0.68rem] font-bold tabular-nums text-forest">
                {count}
              </span>
            )}
          </button>
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} className="grid h-11 w-11 place-items-center rounded-full text-cream hover:bg-cream/10 lg:hidden">
            <Icon name="menu" />
          </button>
        </div>
      </div>

      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
      {menuOpen && <MobileNav onClose={() => setMenuOpen(false)} pathname={pathname} />}
    </header>
  );
}

/** Sticky basket access on small screens. */
export function MobileBasketBar() {
  const pathname = usePathname();
  const { count, quote, setDrawerOpen, hydrated, drawerOpen } = useStore();
  const hidden = ["/basket", "/checkout", "/products/", "/bundles", "/login", "/register"].some((p) => pathname.startsWith(p));
  if (!hydrated || count === 0 || hidden || drawerOpen) return null;
  return (
    <div className="on-dark fixed inset-x-0 bottom-0 z-30 border-t border-gold/30 bg-forest p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <button type="button" onClick={() => setDrawerOpen(true)} className={btn("gold", "md", "w-full justify-between")}>
        <span className="flex items-center gap-2">
          <Icon name="bag" className="h-4 w-4" /> View basket · {count} item{count === 1 ? "" : "s"}
        </span>
        <span className="tabular-nums">{quote ? formatPrice(quote.subtotalPence) : ""}</span>
      </button>
    </div>
  );
}
