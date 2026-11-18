"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { formatPrice, type AddressDTO, type CartLine, type PostcodeResult, type UserDTO } from "@/lib/types";
import { Modal, PasswordInput } from "./client-ui";
import { useStore } from "./store";
import { Field, Icon, Notice, RangeBadge, btn, cx, inputClass } from "./ui";

type Errors = Record<string, string>;

async function post(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, status: res.status, data: await res.json() };
  } catch {
    return { ok: false, status: 0, data: { error: "We couldn't reach the server. Check your connection and try again." } };
  }
}

const NAV = [
  { href: "/account", label: "Overview", icon: "home" },
  { href: "/account/orders", label: "My Orders", icon: "list" },
  { href: "/account/addresses", label: "My Addresses", icon: "pin" },
  { href: "/account/rewards", label: "My Rewards", icon: "gift" },
  { href: "/account/refer", label: "Refer a Friend", icon: "users" },
  { href: "/account/details", label: "Account Details", icon: "user" },
  { href: "/account/preferences", label: "Marketing Preferences", icon: "bell" },
];

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setUser, toast } = useStore();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    const { ok } = await post("/api/auth/logout", {});
    setBusy(false);
    if (!ok) return toast("We couldn't sign you out. Please try again.", "error");
    setUser(null);
    toast("You've been signed out.", "info");
    router.push("/");
    router.refresh();
  };

  return (
    <nav aria-label="Account" className="lg:sticky lg:top-24">
      <ul className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:block lg:space-y-1 lg:rounded-3xl lg:bg-white lg:p-3 lg:shadow-[var(--shadow-card)]">
        {NAV.map((item) => {
          const active = item.href === "/account" ? pathname === "/account" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-none">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-11 items-center gap-3 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors lg:h-12 lg:rounded-2xl",
                  active ? "bg-forest text-cream" : "border border-forest/15 bg-white text-forest hover:bg-forest/5 lg:border-0",
                )}
              >
                <Icon name={item.icon} className={cx("h-4 w-4", active && "text-gold")} />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li className="flex-none lg:mt-2 lg:border-t lg:border-forest/10 lg:pt-2">
          <button type="button" onClick={logout} disabled={busy} className="flex h-11 w-full items-center gap-3 whitespace-nowrap rounded-full border border-forest/15 bg-white px-4 text-sm font-semibold text-charcoal/80 transition-colors hover:bg-danger-soft hover:text-danger lg:h-12 lg:rounded-2xl lg:border-0">
            {busy ? <span className="spinner" /> : <Icon name="logout" className="h-4 w-4" />} Logout
          </button>
        </li>
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Reorder                                                             */
/* ------------------------------------------------------------------ */

type ReorderItem = {
  name: string;
  range: "chilled" | "frozen";
  qty: number;
  wasPence: number;
  nowPence: number | null;
  status: "available" | "unavailable" | "chilled-unchecked" | "not-deliverable";
  reason: string | null;
  line: CartLine | null;
};

export function ReorderButton({ reference, variant = "primary", size = "sm", label = "Reorder" }: { reference: string; variant?: "primary" | "outline" | "gold"; size?: "sm" | "md" | "lg"; label?: string }) {
  const { addLines, setDrawerOpen, requestPostcode, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ status: "loading" } | { status: "error"; message: string } | { status: "ready"; items: ReorderItem[]; postcode: PostcodeResult | null }>({ status: "loading" });

  const check = async () => {
    setOpen(true);
    setState({ status: "loading" });
    const { ok, data } = await post(`/api/orders/${reference}/reorder`, {});
    if (!ok) return setState({ status: "error", message: String(data.error ?? "We couldn't check this order.") });
    setState({ status: "ready", items: data.items as ReorderItem[], postcode: (data.postcode as PostcodeResult | null) ?? null });
  };

  const ready = state.status === "ready" ? state : null;
  const available = ready?.items.filter((i) => i.line) ?? [];
  const needsPostcode = ready?.items.some((i) => i.status === "chilled-unchecked") ?? false;
  const priceChanged = available.some((i) => i.nowPence !== null && i.nowPence !== i.wasPence);

  const add = () => {
    addLines(available.map((i) => i.line as CartLine));
    setOpen(false);
    setDrawerOpen(true);
    toast(`${available.length} item${available.length === 1 ? "" : "s"} from order ${reference} added to your basket.`);
  };

  return (
    <>
      <button type="button" onClick={check} className={btn(variant, size)}>
        <Icon name="refresh" className="h-4 w-4" /> {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Reorder ${reference}`} wide>
        {state.status === "loading" && (
          <div aria-busy="true" className="space-y-3">
            <p className="text-sm text-charcoal/75">Checking today&apos;s availability, prices and delivery for your postcode…</p>
            <div className="skeleton h-14" />
            <div className="skeleton h-14" />
          </div>
        )}
        {state.status === "error" && <Notice tone="error">{state.message}</Notice>}
        {ready && (
          <div>
            <p className="text-sm leading-relaxed text-charcoal/80">
              We&apos;ve checked each item against today&apos;s menu, current prices and delivery to {ready.postcode ? <strong className="text-forest">{ready.postcode.postcode}</strong> : "your area"}.
            </p>
            <ul className="mt-4 divide-y divide-forest/10 rounded-2xl bg-white px-4">
              {ready.items.map((item, i) => {
                const okItem = item.status === "available";
                const changed = okItem && item.nowPence !== null && item.nowPence !== item.wasPence;
                return (
                  <li key={i} className="flex items-start gap-3 py-3.5">
                    <span className={cx("mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full", okItem ? "bg-forest text-gold" : "bg-danger-soft text-danger")}>
                      <Icon name={okItem ? "check" : "close"} className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className={cx("font-semibold", okItem ? "text-forest" : "text-charcoal/60 line-through")}>
                        {item.qty} × {item.name}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <RangeBadge range={item.range} size="sm" />
                        {!okItem && <span className="font-semibold text-danger">{item.reason}</span>}
                        {changed && (
                          <span className="font-semibold text-forest">
                            Price updated: was {formatPrice(item.wasPence)}, now {formatPrice(item.nowPence as number)}
                          </span>
                        )}
                      </p>
                    </div>
                    {okItem && item.nowPence !== null && <span className="text-sm font-semibold tabular-nums text-forest">{formatPrice(item.nowPence)}</span>}
                  </li>
                );
              })}
            </ul>
            {priceChanged && <p className="mt-3 text-xs font-medium text-charcoal/75">Some prices have changed since this order. Today&apos;s prices will apply.</p>}
            {needsPostcode && (
              <Notice className="mt-4" title="Chilled items need a postcode check">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    requestPostcode(undefined, "Check your postcode, then choose Reorder again to add your chilled dishes.");
                  }}
                  className="font-semibold text-forest underline underline-offset-4"
                >
                  Check your postcode
                </button>{" "}
                to confirm chilled delivery, then reorder again.
              </Notice>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={add} disabled={available.length === 0} className={btn("primary", "md", "flex-1")}>
                {available.length === 0 ? "Nothing available to add" : `Add ${available.length} available item${available.length === 1 ? "" : "s"} to basket`}
              </button>
              <button type="button" onClick={() => setOpen(false)} className={btn("outline", "md")}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Addresses                                                           */
/* ------------------------------------------------------------------ */

export function AddressManager({ initial }: { initial: AddressDTO[] }) {
  const { toast } = useStore();
  const [list, setList] = useState(initial);
  const [adding, setAdding] = useState(initial.length === 0);
  const [form, setForm] = useState({ label: "Home", line1: "", line2: "", city: "", postcode: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (action: string, id: number) => {
    if (busy) return;
    setBusy(`${action}-${id}`);
    const { ok, data } = await post("/api/account/addresses", { action, id });
    setBusy(null);
    if (!ok) return toast(String(data.error ?? "Something went wrong."), "error");
    setList(data.addresses as AddressDTO[]);
    toast(action === "delete" ? "Address removed." : "Default address updated.", "info");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy("create");
    setErrors({});
    const { ok, data } = await post("/api/account/addresses", { ...form, action: "create" });
    setBusy(null);
    if (!ok) {
      setErrors((data.fields as Errors) ?? {});
      if (!data.fields) toast(String(data.error ?? "Something went wrong."), "error");
      return;
    }
    setList(data.addresses as AddressDTO[]);
    setForm({ label: "Home", line1: "", line2: "", city: "", postcode: "" });
    setAdding(false);
    toast("Address saved.");
  };

  const field = (id: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, className?: string) => (
    <Field label={label} htmlFor={`addr-${id}`} error={errors[id]} className={className}>
      <input id={`addr-${id}`} value={form[id]} onChange={(e) => setForm({ ...form, [id]: id === "postcode" ? e.target.value.toUpperCase() : e.target.value })} aria-invalid={errors[id] ? true : undefined} className={inputClass} {...props} />
    </Field>
  );

  return (
    <div className="space-y-6">
      {list.length === 0 && !adding && <p className="rounded-3xl border border-dashed border-forest/20 bg-white p-8 text-center text-sm text-charcoal/70">You haven&apos;t saved any addresses yet.</p>}
      <ul className="grid gap-4 sm:grid-cols-2">
        {list.map((a) => (
          <li key={a.id} className={cx("rounded-3xl border bg-white p-5", a.isDefault ? "border-forest" : "border-forest/10")}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-forest">{a.label}</p>
              {a.isDefault && <span className="rounded-full bg-forest px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-gold">Default</span>}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-charcoal/85">
              {a.line1}
              {a.line2 && (
                <>
                  <br />
                  {a.line2}
                </>
              )}
              <br />
              {a.city}
              <br />
              {a.postcode}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {!a.isDefault && (
                <button type="button" onClick={() => act("default", a.id)} disabled={Boolean(busy)} className={btn("outline", "sm")}>
                  {busy === `default-${a.id}` && <span className="spinner" />} Make default
                </button>
              )}
              <button type="button" onClick={() => act("delete", a.id)} disabled={Boolean(busy)} className={btn("danger", "sm")} aria-label={`Remove address ${a.label}, ${a.postcode}`}>
                {busy === `delete-${a.id}` ? <span className="spinner" /> : <Icon name="trash" className="h-4 w-4" />} Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      {adding ? (
        <form onSubmit={submit} noValidate className="grid gap-5 rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] sm:grid-cols-2">
          <h2 className="display text-2xl text-forest sm:col-span-2">Add an address</h2>
          {field("label", "Label", { placeholder: "Home, Work…" }, "sm:col-span-2")}
          {field("line1", "Address line 1", { autoComplete: "address-line1" }, "sm:col-span-2")}
          {field("line2", "Address line 2 (optional)", { autoComplete: "address-line2" }, "sm:col-span-2")}
          {field("city", "Town or city", { autoComplete: "address-level2" })}
          {field("postcode", "Postcode", { autoComplete: "postal-code", maxLength: 9 })}
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={busy === "create"} className={btn("primary", "md")}>
              {busy === "create" && <span className="spinner" />} Save address
            </button>
            {list.length > 0 && (
              <button type="button" onClick={() => setAdding(false)} className={btn("outline", "md")}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={btn("primary", "md")}>
          <Icon name="plus" className="h-4 w-4" /> Add a new address
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Details, password, preferences                                      */
/* ------------------------------------------------------------------ */

export function DetailsForm({ user }: { user: UserDTO }) {
  const router = useRouter();
  const { setUser, toast } = useStore();
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    const { ok, data } = await post("/api/account/details", form);
    setBusy(false);
    if (!ok) {
      setErrors((data.fields as Errors) ?? {});
      return toast(String(data.error ?? "Something went wrong."), "error");
    }
    setUser(data.user as UserDTO);
    toast("Your details have been updated.");
    router.refresh();
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] sm:grid-cols-2 md:p-8">
      <h2 className="display text-2xl text-forest sm:col-span-2">Your details</h2>
      <Field label="Full name" htmlFor="d-name" error={errors.name} className="sm:col-span-2">
        <input id="d-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" aria-invalid={errors.name ? true : undefined} className={inputClass} />
      </Field>
      <Field label="Email" htmlFor="d-email" error={errors.email}>
        <input id="d-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" aria-invalid={errors.email ? true : undefined} className={inputClass} />
      </Field>
      <Field label="Telephone" htmlFor="d-phone" error={errors.phone}>
        <input id="d-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" aria-invalid={errors.phone ? true : undefined} className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className={btn("primary", "md")}>
          {busy && <span className="spinner" />} Save changes
        </button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const { toast } = useStore();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    const { ok, data } = await post("/api/account/password", { currentPassword, newPassword });
    setBusy(false);
    if (!ok) {
      setErrors((data.fields as Errors) ?? {});
      return toast(String(data.error ?? "Something went wrong."), "error");
    }
    setCurrent("");
    setNext("");
    toast("Your password has been changed.");
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] sm:grid-cols-2 md:p-8">
      <h2 className="display text-2xl text-forest sm:col-span-2">Change password</h2>
      <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword}>
        <PasswordInput id="currentPassword" value={currentPassword} onChange={setCurrent} autoComplete="current-password" invalid={Boolean(errors.currentPassword)} className={inputClass} />
      </Field>
      <Field label="New password" htmlFor="newPassword" error={errors.newPassword} hint="At least 8 characters.">
        <PasswordInput id="newPassword" value={newPassword} onChange={setNext} autoComplete="new-password" invalid={Boolean(errors.newPassword)} className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy || !currentPassword || !newPassword} className={btn("outline", "md")}>
          {busy && <span className="spinner" />} Update password
        </button>
      </div>
    </form>
  );
}

export function PreferencesForm({ user }: { user: UserDTO }) {
  const { setUser, toast } = useStore();
  const [prefs, setPrefs] = useState({ marketingEmail: user.marketingEmail, marketingSms: user.marketingSms });
  const [busy, setBusy] = useState(false);
  const dirty = prefs.marketingEmail !== user.marketingEmail || prefs.marketingSms !== user.marketingSms;
  const [saved, setSaved] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const { ok, data } = await post("/api/account/preferences", prefs);
    setBusy(false);
    if (!ok) return toast(String(data.error ?? "Something went wrong."), "error");
    setUser(data.user as UserDTO);
    setSaved(true);
    toast("Your marketing preferences have been saved.");
  };

  const row = (key: "marketingEmail" | "marketingSms", title: string, body: string) => (
    <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-forest/10 p-5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold">
      <span>
        <span className="font-semibold text-forest">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-charcoal/75">{body}</span>
      </span>
      <span className="relative mt-1 flex-none">
        <input
          type="checkbox"
          role="switch"
          checked={prefs[key]}
          onChange={(e) => {
            setPrefs({ ...prefs, [key]: e.target.checked });
            setSaved(false);
          }}
          className="peer sr-only"
        />
        <span className="block h-7 w-12 rounded-full bg-forest/20 transition-colors peer-checked:bg-forest" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 peer-checked:bg-gold" />
      </span>
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] md:p-8">
      {row("marketingEmail", "Email", "New dishes, seasonal specials and member offers by email.")}
      {row("marketingSms", "Text message", "Occasional offers and reminders by SMS to the number on your account.")}
      <p className="text-xs leading-relaxed text-charcoal/65">
        We only send marketing if you opt in here. Order and delivery messages are always sent because they&apos;re needed to fulfil your order. See our{" "}
        <Link href="/legal/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={busy || (!dirty && !saved) || saved} className={btn("primary", "md")}>
          {busy && <span className="spinner" />} {saved ? "Saved" : "Save preferences"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Referral & rewards helpers                                          */
/* ------------------------------------------------------------------ */

export function CopyField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const { toast } = useStore();
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API can be blocked (for example inside an embedded preview): fall back to selecting the text.
      input.current?.select();
      try {
        document.execCommand("copy");
      } catch {
        toast("Press Ctrl/Cmd + C to copy the selected text.", "info");
        return;
      }
    }
    setCopied(true);
    toast(`${label} copied to your clipboard.`);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const id = `copy-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-cream">
        {label}
      </label>
      <div className="flex gap-2 rounded-full border border-gold/40 bg-cream/5 p-1">
        <input ref={input} id={id} readOnly value={value} onFocus={(e) => e.currentTarget.select()} className={cx("h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-cream focus:outline-none", mono && "font-bold tracking-[0.18em] text-gold")} />
        <button type="button" onClick={copy} className="flex h-11 flex-none items-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-forest transition-colors hover:bg-gold-soft">
          <Icon name={copied ? "check" : "copy"} className="h-4 w-4" /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function RedeemButton({ points, valuePence, disabled }: { points: number; valuePence: number; disabled: boolean }) {
  const router = useRouter();
  const { setRedeemPoints, count, toast } = useStore();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        setRedeemPoints(points);
        if (count > 0) {
          toast(`${points} points (${formatPrice(valuePence)} off) will be applied in your basket.`);
          router.push("/basket");
        } else {
          toast(`${points} points are ready to use. Add some dishes and they'll be applied in your basket.`, "info");
          router.push("/shop");
        }
      }}
      className={btn(disabled ? "outline" : "primary", "sm", "w-full")}
    >
      {disabled ? "Not enough points yet" : "Redeem on my next order"}
    </button>
  );
}
