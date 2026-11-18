"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { BundleDTO, BundleSelection, CartLine, PostcodeResult, ProductDTO, Quote, UserDTO } from "@/lib/types";
import { Icon, cx } from "./ui";

const STORAGE_KEY = "cc_cart_v1";

type Toast = { id: number; message: string; tone: "success" | "error" | "info"; action?: { label: string; onClick: () => void } };
export type AddResult = "added" | "needs-postcode" | "blocked";
export type PostcodeOutcome = { ok: true; result: PostcodeResult } | { ok: false; kind: "invalid" | "error"; error: string };
type PostcodePrompt = { open: boolean; reason?: string; pending?: () => void };

type Store = {
  hydrated: boolean;
  user: UserDTO | null;
  setUser: (u: UserDTO | null) => void;
  postcode: PostcodeResult | null;
  checkPostcode: (raw: string) => Promise<PostcodeOutcome>;
  clearPostcode: () => void;
  postcodePrompt: PostcodePrompt;
  requestPostcode: (pending?: () => void, reason?: string) => void;
  closePostcodePrompt: () => void;
  lines: CartLine[];
  count: number;
  quote: Quote | null;
  setQuote: (q: Quote | null) => void;
  quoteLoading: boolean;
  quoteError: string | null;
  addProduct: (product: ProductDTO, opts?: { variantId?: string; qty?: number; openDrawer?: boolean }) => AddResult;
  addBundle: (bundle: BundleDTO, selections: BundleSelection[]) => AddResult;
  addProducts: (products: ProductDTO[]) => AddResult;
  addLines: (lines: CartLine[]) => void;
  setQty: (key: string, qty: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  promoCode: string;
  setPromoCode: (code: string) => void;
  redeemPoints: number;
  setRedeemPoints: (points: number) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  bumpKey: number;
  toasts: Toast[];
  toast: (message: string, tone?: Toast["tone"], action?: Toast["action"]) => void;
  dismissToast: (id: number) => void;
};

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

function mergeLines(prev: CartLine[], incoming: CartLine[]): CartLine[] {
  const next = [...prev];
  for (const line of incoming) {
    const index = next.findIndex((l) => l.key === line.key);
    if (index >= 0) next[index] = { ...next[index], qty: Math.min(12, next[index].qty + line.qty) } as CartLine;
    else next.push(line);
  }
  return next;
}

export function StoreProvider({ children, initialUser, initialPostcode }: { children: ReactNode; initialUser: UserDTO | null; initialPostcode: PostcodeResult | null }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<UserDTO | null>(initialUser);
  const [postcode, setPostcode] = useState<PostcodeResult | null>(initialPostcode);
  const [postcodePrompt, setPostcodePrompt] = useState<PostcodePrompt>({ open: false });
  const [lines, setLines] = useState<CartLine[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bumpKey, setBumpKey] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => setUser(initialUser), [initialUser]);

  // Restore the basket saved in this browser.
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved && Array.isArray(saved.lines)) setLines(saved.lines);
      if (saved && typeof saved.promoCode === "string") setPromoCode(saved.promoCode);
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines, promoCode }));
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }, [hydrated, lines, promoCode]);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback<Store["toast"]>(
    (message, tone = "success", action) => {
      const id = ++toastId.current;
      setToasts((t) => [...t.slice(-2), { id, message, tone, action }]);
      window.setTimeout(() => dismissToast(id), tone === "error" ? 7000 : 4200);
    },
    [dismissToast],
  );

  // Every basket change is re-priced and re-validated by the server.
  const userId = user?.id ?? null;
  const postcodeValue = postcode?.postcode ?? null;
  useEffect(() => {
    if (!hydrated) return;
    if (lines.length === 0) {
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setQuoteLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lines, postcode: postcodeValue, promoCode, redeemPoints }),
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (ctrl.signal.aborted) return;
        if (res.ok) {
          setQuote(data.quote);
          setQuoteError(null);
        } else setQuoteError(data.error ?? "We couldn't update your basket.");
      } catch {
        if (!ctrl.signal.aborted) setQuoteError("We couldn't update your basket. Check your connection and try again.");
      } finally {
        if (!ctrl.signal.aborted) setQuoteLoading(false);
      }
    }, 140);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [hydrated, lines, postcodeValue, promoCode, redeemPoints, userId]);

  const checkPostcode = useCallback<Store["checkPostcode"]>(async (raw) => {
    try {
      const res = await fetch("/api/postcode", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ postcode: raw }) });
      const data = await res.json();
      if (!res.ok) return { ok: false, kind: res.status === 422 ? "invalid" : "error", error: data.error ?? "We couldn't check that postcode." };
      setPostcode(data.result);
      return { ok: true, result: data.result as PostcodeResult };
    } catch {
      return { ok: false, kind: "error", error: "We couldn't reach the delivery checker. Check your connection and try again." };
    }
  }, []);

  const clearPostcode = useCallback(() => {
    setPostcode(null);
    fetch("/api/postcode", { method: "DELETE" }).catch(() => {});
  }, []);

  const requestPostcode = useCallback((pending?: () => void, reason?: string) => setPostcodePrompt({ open: true, pending, reason }), []);
  const closePostcodePrompt = useCallback(() => setPostcodePrompt({ open: false }), []);

  const commit = useCallback(
    (incoming: CartLine[], message: string, openDrawer = false) => {
      setLines((prev) => mergeLines(prev, incoming));
      setBumpKey((k) => k + 1);
      if (openDrawer) setDrawerOpen(true);
      else toast(message, "success", { label: "View basket", onClick: () => setDrawerOpen(true) });
    },
    [toast],
  );

  /** Enforces the delivery rules before anything enters the basket. */
  const gate = useCallback(
    (range: "chilled" | "frozen", name: string, run: () => void): AddResult => {
      if (range === "chilled") {
        if (!postcode) {
          requestPostcode(run, `Chilled meals are delivered to selected postcodes. Check yours to add ${name}.`);
          return "needs-postcode";
        }
        if (!postcode.chilled) {
          toast(`Chilled delivery isn't available for ${postcode.postcode}. Our frozen range is delivered UK-wide.`, "error");
          return "blocked";
        }
      } else if (postcode && !postcode.frozen) {
        toast(postcode.frozenNote ?? `Frozen delivery isn't available for ${postcode.postcode}.`, "error");
        return "blocked";
      }
      run();
      return "added";
    },
    [postcode, requestPostcode, toast],
  );

  const addProduct = useCallback<Store["addProduct"]>(
    (product, opts = {}) => {
      if (!product.available) {
        toast(`${product.name} is currently unavailable.`, "error");
        return "blocked";
      }
      const variant = product.variants.find((v) => v.id === opts.variantId) ?? product.variants[0];
      const qty = Math.max(1, Math.min(opts.qty ?? 1, product.maxPerOrder));
      const line: CartLine = { key: `p:${product.id}:${variant.id}`, type: "product", productId: product.id, variantId: variant.id, qty };
      return gate(product.range, product.name, () => commit([line], `${product.name} added to your basket`, opts.openDrawer));
    },
    [commit, gate, toast],
  );

  const addBundle = useCallback<Store["addBundle"]>(
    (bundle, selections) => {
      const line: CartLine = { key: `b:${bundle.id}:${Date.now().toString(36)}`, type: "bundle", bundleId: bundle.id, selections, qty: 1 };
      return gate(bundle.range, bundle.name, () => commit([line], `${bundle.name} added to your basket`, true));
    },
    [commit, gate],
  );

  /** Adds several products of the same range behind a single delivery check. */
  const addProducts = useCallback<Store["addProducts"]>(
    (products) => {
      const items = products.filter((p) => p.available);
      if (!items.length) return "blocked";
      const incoming: CartLine[] = items.map((p) => ({ key: `p:${p.id}:${p.variants[0].id}`, type: "product", productId: p.id, variantId: p.variants[0].id, qty: 1 }));
      const range = items.some((p) => p.range === "chilled") ? "chilled" : "frozen";
      return gate(range, "these dishes", () => commit(incoming, `${items.length} item${items.length === 1 ? "" : "s"} added to your basket`, true));
    },
    [commit, gate],
  );

  const addLines = useCallback((incoming: CartLine[]) => {
    setLines((prev) => mergeLines(prev, incoming));
    setBumpKey((k) => k + 1);
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) => (qty < 1 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? ({ ...l, qty } as CartLine) : l))));
  }, []);
  const removeLine = useCallback((key: string) => setLines((prev) => prev.filter((l) => l.key !== key)), []);
  const clearCart = useCallback(() => {
    setLines([]);
    setPromoCode("");
    setRedeemPoints(0);
  }, []);

  const count = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);

  const value: Store = {
    hydrated,
    user,
    setUser,
    postcode,
    checkPostcode,
    clearPostcode,
    postcodePrompt,
    requestPostcode,
    closePostcodePrompt,
    lines,
    count,
    quote,
    setQuote,
    quoteLoading,
    quoteError,
    addProduct,
    addBundle,
    addProducts,
    addLines,
    setQty,
    removeLine,
    clearCart,
    promoCode,
    setPromoCode,
    redeemPoints,
    setRedeemPoints,
    drawerOpen,
    setDrawerOpen,
    bumpKey,
    toasts,
    toast,
    dismissToast,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function Toaster() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-8" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={cx(
            "toast pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl py-3 pl-4 pr-2 text-sm font-medium shadow-[var(--shadow-lift)]",
            t.tone === "error" ? "bg-danger text-white" : "on-dark bg-forest text-cream ring-1 ring-gold/40",
          )}
        >
          <span className={cx("pop grid h-7 w-7 flex-none place-items-center rounded-full", t.tone === "error" ? "bg-white/15" : "bg-gold text-forest")}>
            <Icon name={t.tone === "error" ? "alert" : t.tone === "info" ? "info" : "check"} className="h-4 w-4" />
          </span>
          <span className="flex-1 leading-snug">{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action?.onClick();
                dismissToast(t.id);
              }}
              className="flex-none rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-gold underline-offset-4 hover:underline"
            >
              {t.action.label}
            </button>
          )}
          <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss notification" className="grid h-9 w-9 flex-none place-items-center rounded-full opacity-70 hover:opacity-100">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
