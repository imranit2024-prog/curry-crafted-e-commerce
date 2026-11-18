"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Icon, cx } from "./ui";

/** Scroll-triggered entrance. Content stays visible without JS and under reduced motion (see globals.css). */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as RefObject<never>}
      className={cx("reveal", shown && "is-in", className)}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 12,
  size = "md",
  label = "Quantity",
  disabled = false,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  label?: string;
  disabled?: boolean;
}) {
  const dim = size === "sm" ? "h-9 w-9" : "h-12 w-12";
  return (
    <div role="group" aria-label={label} className={cx("inline-flex items-center rounded-full border border-forest/20 bg-white", disabled && "opacity-50")}>
      <button
        type="button"
        className={cx(dim, "grid place-items-center rounded-full text-forest transition-colors hover:bg-forest/5 disabled:opacity-30")}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <Icon name="minus" className="h-4 w-4" />
      </button>
      <span aria-live="polite" className={cx("min-w-8 text-center font-semibold tabular-nums text-forest", size === "sm" ? "text-sm" : "text-base")}>
        {value}
      </span>
      <button
        type="button"
        className={cx(dim, "grid place-items-center rounded-full text-forest transition-colors hover:bg-forest/5 disabled:opacity-30")}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <Icon name="plus" className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Shared dialog behaviour: Escape to close, scroll lock, focus trap and focus restore. */
export function useDialog(open: boolean, onClose: () => void): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = ref.current;
    const focusables = () =>
      panel ? Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')) : [];
    const timer = window.setTimeout(() => {
      const target = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0];
      target?.focus();
    }, 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      } else if (e.key === "Tab") {
        const items = focusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);
  return ref;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="fade-in absolute inset-0 bg-forest/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx("toast relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-[var(--shadow-lift)] sm:rounded-3xl sm:p-8", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="display text-2xl text-forest sm:text-3xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-1 grid h-11 w-11 flex-none place-items-center rounded-full text-forest transition-colors hover:bg-forest/10">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  invalid,
  className,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  invalid?: boolean;
  className: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={cx(className, "pr-12")}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-lg text-forest/70 transition-colors hover:bg-forest/5 hover:text-forest"
      >
        <Icon name={visible ? "eye-off" : "eye"} />
      </button>
    </div>
  );
}
