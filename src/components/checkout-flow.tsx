"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { formatPrice, type AddressDTO } from "@/lib/types";
import { OrderTotals } from "./basket-view";
import { ChilledSlotPicker, FrozenEstimate, ScheduleSkeleton, useSchedule, type SlotChoice } from "./schedule";
import { useStore } from "./store";
import { Field, Icon, Notice, RangeBadge, btn, cx, inputClass } from "./ui";

const STEPS = ["Information", "Address", "Schedule", "Review", "Payment", "Confirmation"];
const SESSION_KEY = "cc_checkout_v1";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+()\s-]{7,20}$/;

type Customer = { name: string; email: string; phone: string };
type Address = { line1: string; line2: string; city: string; postcode: string };
type Order = { reference: string; totalPence: number; payment: { mode: "stripe"; url: string } | { mode: "demo" } };
type Errors = Record<string, string>;

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);

function StepShell({ index, title, intro, children }: { index: number; title: string; intro?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`step-${index}`} className="fade-up rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] md:p-9" style={{ animationDelay: "0ms" }}>
      <p className="eyebrow text-forest/60">
        Step {String(index + 1).padStart(2, "0")} of {String(STEPS.length).padStart(2, "0")}
      </p>
      <h2 id={`step-${index}`} tabIndex={-1} className="display mt-2 text-3xl text-forest focus:outline-none md:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-2 text-sm leading-relaxed text-charcoal/75">{intro}</p>}
      <div className="mt-7">{children}</div>
    </section>
  );
}

export function CheckoutFlow({ stripeEnabled, guestCheckout, savedAddresses, paymentCancelled }: { stripeEnabled: boolean; guestCheckout: boolean; savedAddresses: AddressDTO[]; paymentCancelled: boolean }) {
  const router = useRouter();
  const { hydrated, user, lines, quote, setQuote, quoteLoading, checkPostcode, postcode, removeLine, promoCode, redeemPoints, clearCart, toast } = useStore();
  const [schedule, reloadSchedule] = useSchedule();

  const defaultAddress = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0] ?? null;
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<Customer>({ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" });
  const [addressId, setAddressId] = useState<number | "new">(defaultAddress?.id ?? "new");
  const [address, setAddress] = useState<Address>(defaultAddress ? { line1: defaultAddress.line1, line2: defaultAddress.line2, city: defaultAddress.city, postcode: defaultAddress.postcode } : { line1: "", line2: "", city: "", postcode: postcode?.postcode ?? "" });
  const [saveAddress, setSaveAddress] = useState(false);
  const [choice, setChoice] = useState<SlotChoice>({ date: null, slotId: null });
  const [errors, setErrors] = useState<Errors>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [payState, setPayState] = useState<"idle" | "processing" | "failed" | "success">("idle");
  const [payError, setPayError] = useState<string | null>(null);
  const [card, setCard] = useState({ cardNumber: "", expiry: "", cvc: "" });
  const [cancelled, setCancelled] = useState(paymentCancelled);
  const attemptKey = useRef(newKey());
  const submitting = useRef(false);
  const restored = useRef(false);

  // Restore details entered earlier in this browser session (for example after returning from Stripe).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? "null");
      if (!saved) return;
      if (saved.customer) setCustomer((c) => ({ ...c, ...saved.customer }));
      if (saved.address) {
        setAddress(saved.address);
        setAddressId(saved.addressId ?? "new");
      }
      if (paymentCancelled && saved.choice?.date) {
        setChoice(saved.choice);
        setStep(3);
      }
    } catch {
      /* ignore */
    }
  }, [paymentCancelled]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ customer, address, addressId, choice }));
    } catch {
      /* ignore */
    }
  }, [customer, address, addressId, choice]);

  // Move focus to the new step heading for keyboard and screen-reader users.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.getElementById(`step-${step}`)?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const goTo = (next: number) => {
    // Editing anything after an order was prepared starts a fresh attempt.
    if (order && next < 4) {
      setOrder(null);
      attemptKey.current = newKey();
      setPayState("idle");
      setPayError(null);
    }
    setStepError(null);
    setErrors({});
    setStep(next);
  };

  if (!hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]" aria-busy="true">
        <div className="skeleton h-96" />
        <div className="skeleton h-80" />
      </div>
    );
  }

  if (lines.length === 0 && payState !== "success") {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
        <p className="display text-3xl text-forest">Your basket is empty</p>
        <p className="mt-2 text-sm text-charcoal/75">Add some dishes before checking out.</p>
        <Link href="/shop" className={btn("primary", "md", "mt-6")}>
          Browse the menu
        </Link>
      </div>
    );
  }

  if (!user && !guestCheckout) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
        <p className="display text-3xl text-forest">Sign in to check out</p>
        <p className="mt-2 text-sm text-charcoal/75">An account is needed to place an order.</p>
        <Link href="/login?next=/checkout" className={btn("primary", "md", "mt-6")}>
          Sign in or register
        </Link>
      </div>
    );
  }

  const hasChilled = Boolean(quote?.chilled);
  const hasFrozen = Boolean(quote?.frozen);
  const selectedDate = schedule.status === "ready" ? schedule.data.chilled.find((d) => d.date === choice.date) : undefined;
  const selectedSlot = selectedDate?.slots.find((s) => s.id === choice.slotId);

  /* ---------------- Step handlers ---------------- */

  const submitInfo = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (customer.name.trim().length < 2) next.name = "Enter your full name.";
    if (!EMAIL_RE.test(customer.email.trim())) next.email = "Enter a valid email address.";
    if (!PHONE_RE.test(customer.phone.trim())) next.phone = "Enter a valid telephone number.";
    setErrors(next);
    if (!Object.keys(next).length) goTo(1);
  };

  const submitAddress = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next: Errors = {};
    if (address.line1.trim().length < 3) next.line1 = "Enter the first line of your address.";
    if (address.city.trim().length < 2) next.city = "Enter your town or city.";
    if (!address.postcode.trim()) next.postcode = "Enter your postcode.";
    setErrors(next);
    setStepError(null);
    if (Object.keys(next).length) return;
    setBusy(true);
    const outcome = await checkPostcode(address.postcode);
    setBusy(false);
    if (!outcome.ok) {
      if (outcome.kind === "invalid") setErrors({ postcode: outcome.error });
      else setStepError(outcome.error);
      return;
    }
    setAddress((a) => ({ ...a, postcode: outcome.result.postcode }));
    if (hasChilled && !outcome.result.chilled) return setStepError("chilled");
    if (hasFrozen && !outcome.result.frozen) return setStepError("frozen");
    goTo(2);
  };

  const removeRange = (range: "chilled" | "frozen") => {
    quote?.lines.filter((l) => l.range === range).forEach((l) => removeLine(l.key));
    setStepError(null);
    toast(`${range === "chilled" ? "Chilled" : "Frozen"} items removed from your basket.`, "info");
  };

  const submitSchedule = (e: FormEvent) => {
    e.preventDefault();
    if (hasChilled && (!selectedDate?.open || !selectedSlot?.available)) {
      setStepError("Choose a delivery day and an available time slot for your chilled meals.");
      return;
    }
    goTo(3);
  };

  const placeOrder = async () => {
    if (submitting.current || !quote) return;
    submitting.current = true;
    setBusy(true);
    setStepError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines,
          customer,
          address,
          chilledDate: choice.date,
          chilledSlotId: choice.slotId,
          promoCode,
          redeemPoints: quote.rewards.applied,
          saveAddress: saveAddress && addressId === "new",
          idempotencyKey: attemptKey.current,
          expectedTotalPence: quote.totalPence,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.quote) setQuote(data.quote);
        if (data.fields) {
          setErrors(data.fields);
          const keys = Object.keys(data.fields);
          setStep(keys.some((k) => ["name", "email", "phone"].includes(k)) ? 0 : 1);
        }
        if (res.status === 409 && /slot|cut-off/i.test(data.error ?? "")) {
          reloadSchedule();
          setChoice({ date: null, slotId: null });
          setStep(2);
        }
        setStepError(data.error ?? "We couldn't place your order. Please try again.");
        return;
      }
      if (data.paid) {
        clearCart();
        router.push(`/checkout/confirmation/${data.reference}`);
        return;
      }
      setOrder({ reference: data.reference, totalPence: data.totalPence, payment: data.payment });
      setCancelled(false);
      setStep(4);
    } catch {
      setStepError("We couldn't reach the server. You haven't been charged and your basket is safe. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const payDemo = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting.current || !order) return;
    submitting.current = true;
    setPayState("processing");
    setPayError(null);
    setErrors({});
    try {
      const res = await fetch("/api/checkout/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reference: order.reference, ...card }) });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields) {
          setErrors(data.fields);
          setPayState("idle");
        } else {
          setPayState("failed");
          setPayError(data.error ?? "The payment couldn't be completed.");
        }
        return;
      }
      setPayState("success");
      clearCart();
      try {
        window.sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* ignore */
      }
      router.push(`/checkout/confirmation/${order.reference}`);
    } catch {
      setPayState("failed");
      setPayError("We couldn't reach the payment service. You haven't been charged. Please try again.");
    } finally {
      submitting.current = false;
    }
  };

  const payStripe = () => {
    if (submitting.current || !order || order.payment.mode !== "stripe") return;
    submitting.current = true;
    setPayState("processing");
    window.location.assign(order.payment.url);
  };

  const input = (id: keyof Customer | keyof Address, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input id={id} name={id} aria-invalid={errors[id] ? true : undefined} aria-describedby={errors[id] ? `${id}-error` : undefined} className={inputClass} {...props} />
  );

  const blocked = quote && !quote.canCheckout && step !== 1 && step < 4;

  return (
    <div>
      {/* Progress */}
      <nav aria-label="Checkout progress" className="mb-8">
        <div className="relative h-1 overflow-hidden rounded-full bg-forest/10">
          <div className="progress-fill absolute inset-y-0 left-0 rounded-full bg-forest" style={{ width: `${((step + 0.5) / STEPS.length) * 100}%` }} />
        </div>
        <ol className="mt-3 grid grid-cols-6 gap-1">
          {STEPS.map((label, i) => {
            const state = i < step ? "done" : i === step ? "current" : "todo";
            const clickable = i < step && step < 4 && payState !== "processing";
            return (
              <li key={label} className="text-center">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => goTo(i)}
                  aria-current={state === "current" ? "step" : undefined}
                  className={cx("mx-auto flex flex-col items-center gap-1.5 rounded-lg px-1 py-1 text-[0.62rem] font-bold uppercase tracking-wider sm:text-[0.7rem]", state === "todo" ? "text-charcoal/45" : "text-forest", clickable && "hover:underline")}
                >
                  <span className={cx("grid h-7 w-7 place-items-center rounded-full text-xs transition-colors duration-500", state === "done" && "bg-forest text-gold", state === "current" && "bg-gold text-forest ring-4 ring-gold/30", state === "todo" && "bg-forest/10 text-forest/50")}>
                    {state === "done" ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="hidden sm:block">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-1 text-center text-xs font-semibold text-forest sm:hidden">{STEPS[step]}</p>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:gap-12">
        <div className="space-y-5">
          {cancelled && step < 4 && (
            <Notice tone="error" title="Payment was cancelled">
              You haven&apos;t been charged and your basket has been kept. Review your order below and try again when you&apos;re ready.
            </Notice>
          )}
          {blocked && (
            <Notice tone="error" title="Your basket needs attention before you can check out">
              {quote.blockers[0]}{" "}
              <Link href="/basket" className="font-semibold underline underline-offset-4">
                Return to basket
              </Link>
            </Notice>
          )}

          {/* STEP 01 */}
          {step === 0 && (
            <StepShell index={0} title="Your details" intro="We'll use these to send your order confirmation and delivery updates.">
              {!user && (
                <p className="mb-6 rounded-2xl bg-sage px-4 py-3 text-sm text-charcoal/85">
                  Checking out as a guest.{" "}
                  <Link href="/login?next=/checkout" className="font-semibold text-forest underline underline-offset-4">
                    Sign in
                  </Link>{" "}
                  to use saved addresses and earn reward points on this order.
                </p>
              )}
              <form onSubmit={submitInfo} noValidate className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" htmlFor="name" error={errors.name} className="sm:col-span-2">
                  {input("name", { value: customer.name, onChange: (e) => setCustomer({ ...customer, name: e.target.value }), autoComplete: "name" })}
                </Field>
                <Field label="Email" htmlFor="email" error={errors.email}>
                  {input("email", { type: "email", value: customer.email, onChange: (e) => setCustomer({ ...customer, email: e.target.value }), autoComplete: "email" })}
                </Field>
                <Field label="Telephone number" htmlFor="phone" error={errors.phone} hint="For delivery updates on the day.">
                  {input("phone", { type: "tel", value: customer.phone, onChange: (e) => setCustomer({ ...customer, phone: e.target.value }), autoComplete: "tel" })}
                </Field>
                <div className="sm:col-span-2">
                  <button type="submit" disabled={Boolean(blocked)} className={btn("primary", "lg", "w-full sm:w-auto")}>
                    Continue to address <Icon name="arrow-right" className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </StepShell>
          )}

          {/* STEP 02 */}
          {step === 1 && (
            <StepShell index={1} title="Delivery address" intro="Your postcode decides which ranges we can deliver, so we validate it here before you choose a delivery day.">
              <form onSubmit={submitAddress} noValidate className="space-y-6">
                {savedAddresses.length > 0 && (
                  <fieldset>
                    <legend className="text-sm font-semibold text-forest">Saved addresses</legend>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[...savedAddresses, null].map((a) => {
                        const id = a?.id ?? "new";
                        const active = addressId === id;
                        return (
                          <label key={id} className={cx("flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold", active ? "border-forest bg-sage" : "border-forest/15 bg-white hover:border-forest/40")}>
                            <input
                              type="radio"
                              name="saved-address"
                              checked={active}
                              onChange={() => {
                                setAddressId(id);
                                setErrors({});
                                setStepError(null);
                                setAddress(a ? { line1: a.line1, line2: a.line2, city: a.city, postcode: a.postcode } : { line1: "", line2: "", city: "", postcode: "" });
                              }}
                              className="mt-0.5 h-5 w-5 flex-none accent-[#0F2418]"
                            />
                            {a ? (
                              <span>
                                <span className="font-semibold text-forest">
                                  {a.label}
                                  {a.isDefault && <span className="ml-2 rounded-full bg-forest px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-gold">Default</span>}
                                </span>
                                <span className="mt-1 block text-charcoal/80">
                                  {a.line1}
                                  {a.line2 && `, ${a.line2}`}, {a.city}, {a.postcode}
                                </span>
                              </span>
                            ) : (
                              <span className="font-semibold text-forest">Use a new address</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                {addressId === "new" && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Address line 1" htmlFor="line1" error={errors.line1} className="sm:col-span-2">
                      {input("line1", { value: address.line1, onChange: (e) => setAddress({ ...address, line1: e.target.value }), autoComplete: "address-line1" })}
                    </Field>
                    <Field label="Address line 2 (optional)" htmlFor="line2" className="sm:col-span-2">
                      {input("line2", { value: address.line2, onChange: (e) => setAddress({ ...address, line2: e.target.value }), autoComplete: "address-line2" })}
                    </Field>
                    <Field label="Town or city" htmlFor="city" error={errors.city}>
                      {input("city", { value: address.city, onChange: (e) => setAddress({ ...address, city: e.target.value }), autoComplete: "address-level2" })}
                    </Field>
                    <Field label="Postcode" htmlFor="postcode" error={errors.postcode}>
                      {input("postcode", { value: address.postcode, onChange: (e) => setAddress({ ...address, postcode: e.target.value.toUpperCase() }), autoComplete: "postal-code", maxLength: 9, className: cx(inputClass, "uppercase tracking-wider") })}
                    </Field>
                    {user && (
                      <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-charcoal sm:col-span-2">
                        <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-5 w-5 accent-[#0F2418]" />
                        Save this address to my account
                      </label>
                    )}
                  </div>
                )}

                {(stepError === "chilled" || stepError === "frozen") && postcode && (
                  <Notice tone="error" title={`${stepError === "chilled" ? "Chilled" : "Frozen"} delivery isn't available for ${postcode.postcode}`}>
                    <p>
                      {stepError === "chilled"
                        ? "Chilled meals are only delivered to selected postcodes, so the chilled items in your basket can't be sent to this address."
                        : (postcode.frozenNote ?? "This postcode is outside our frozen courier coverage.")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button type="button" onClick={() => removeRange(stepError)} className={btn("danger", "sm")}>
                        Remove {stepError} items and continue
                      </button>
                      {stepError === "chilled" && (
                        <Link href="/frozen" className={btn("outline", "sm")}>
                          Shop frozen instead
                        </Link>
                      )}
                    </div>
                    <p className="mt-3 text-xs">Or enter a different delivery address above.</p>
                  </Notice>
                )}
                {stepError && stepError !== "chilled" && stepError !== "frozen" && <Notice tone="error">{stepError}</Notice>}

                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => goTo(0)} className={btn("outline", "lg")}>
                    Back
                  </button>
                  <button type="submit" disabled={busy} className={btn("primary", "lg", "flex-1 sm:flex-none")}>
                    {busy ? (
                      <>
                        <span className="spinner" /> Checking delivery…
                      </>
                    ) : (
                      <>
                        Validate &amp; continue <Icon name="arrow-right" className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </StepShell>
          )}

          {/* STEP 03 */}
          {step === 2 && (
            <StepShell index={2} title="Delivery schedule" intro={hasChilled && hasFrozen ? "Your order contains both ranges. They are fulfilled separately, so each has its own arrangement below." : undefined}>
              <form onSubmit={submitSchedule} className="space-y-6">
                {schedule.status === "loading" && <ScheduleSkeleton />}
                {schedule.status === "error" && (
                  <Notice tone="error" title="We couldn't load delivery dates">
                    {schedule.message}
                    <button type="button" onClick={reloadSchedule} className={btn("outline", "sm", "mt-3 flex")}>
                      <Icon name="refresh" className="h-4 w-4" /> Try again
                    </button>
                  </Notice>
                )}
                {schedule.status === "ready" && (
                  <>
                    {hasChilled && (
                      <div className="rounded-2xl border border-forest/10 p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <RangeBadge range="chilled" />
                          <span className="text-xs font-medium text-charcoal/65">Refrigerated delivery to {postcode?.postcode ?? address.postcode}</span>
                        </div>
                        <ChilledSlotPicker
                          data={schedule.data}
                          value={choice}
                          onChange={(c) => {
                            setChoice(c);
                            setStepError(null);
                          }}
                          idPrefix="checkout"
                        />
                      </div>
                    )}
                    {hasFrozen && (
                      <div className="rounded-2xl border border-forest/10 bg-sage p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <RangeBadge range="frozen" />
                          <span className="text-xs font-medium text-charcoal/65">Tracked courier</span>
                        </div>
                        <FrozenEstimate data={schedule.data} />
                      </div>
                    )}
                    {hasChilled && hasFrozen && (
                      <Notice title="Two separate deliveries">Your chilled meals arrive in the slot you choose. Your frozen meals are sent by courier and will arrive separately, possibly on a different day.</Notice>
                    )}
                  </>
                )}
                {stepError && <Notice tone="error">{stepError}</Notice>}
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => goTo(1)} className={btn("outline", "lg")}>
                    Back
                  </button>
                  <button type="submit" disabled={schedule.status !== "ready" || Boolean(blocked)} className={btn("primary", "lg", "flex-1 sm:flex-none")}>
                    Continue to review <Icon name="arrow-right" className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </StepShell>
          )}

          {/* STEP 04 */}
          {step === 3 && quote && (
            <StepShell index={3} title="Review your order" intro="Prices, availability and delivery are checked once more when you continue.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-forest/10 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-forest">Contact</p>
                    <button type="button" onClick={() => goTo(0)} className="text-xs font-semibold text-forest underline underline-offset-4">
                      Edit
                    </button>
                  </div>
                  <p className="mt-2 leading-relaxed text-charcoal/85">
                    {customer.name}
                    <br />
                    {customer.email}
                    <br />
                    {customer.phone}
                  </p>
                </div>
                <div className="rounded-2xl border border-forest/10 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-forest">Deliver to</p>
                    <button type="button" onClick={() => goTo(1)} className="text-xs font-semibold text-forest underline underline-offset-4">
                      Edit
                    </button>
                  </div>
                  <p className="mt-2 leading-relaxed text-charcoal/85">
                    {address.line1}
                    {address.line2 && (
                      <>
                        <br />
                        {address.line2}
                      </>
                    )}
                    <br />
                    {address.city}, {address.postcode}
                  </p>
                </div>
              </div>

              {(["chilled", "frozen"] as const).map((range) => {
                const group = quote[range];
                const mine = quote.lines.filter((l) => l.range === range);
                if (!group || !mine.length) return null;
                return (
                  <div key={range} className="mt-5 rounded-2xl border border-forest/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <RangeBadge range={range} />
                      <button type="button" onClick={() => goTo(2)} className="text-xs font-semibold text-forest underline underline-offset-4">
                        Change delivery
                      </button>
                    </div>
                    <p className="mt-3 flex items-start gap-2 text-sm font-medium text-forest">
                      <Icon name={range === "chilled" ? "calendar" : "truck"} className="mt-0.5 h-4 w-4 flex-none" />
                      {range === "chilled"
                        ? selectedDate && selectedSlot
                          ? `${selectedDate.longLabel}, ${selectedSlot.label}`
                          : "No delivery slot chosen yet"
                        : schedule.status === "ready"
                          ? `Dispatched ${schedule.data.frozen.dispatchLabel} · estimated delivery ${schedule.data.frozen.estimateLabel}`
                          : "Dispatch estimate unavailable"}
                    </p>
                    <ul className="mt-3 divide-y divide-forest/10">
                      {mine.map((l) => (
                        <li key={l.key} className="flex gap-3 py-3">
                          <span className="relative h-14 w-14 flex-none overflow-hidden rounded-xl bg-forest">{l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />}</span>
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="block font-semibold text-forest">
                              {l.qty} × {l.name}
                            </span>
                            {l.variantLabel && <span className="text-xs text-charcoal/65">{l.variantLabel}</span>}
                            {l.contents && <span className="mt-1 block text-xs leading-relaxed text-charcoal/70">{l.contents.map((c) => `${c.qty} × ${c.name}`).join(" · ")}</span>}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-forest">{formatPrice(l.lineTotalPence)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              <div className="mt-5 rounded-2xl bg-sage p-5">
                <OrderTotals quote={quote} />
                <p className="mt-3 text-xs text-charcoal/70">
                  Need to change a promo code or reward points?{" "}
                  <Link href="/basket" className="font-semibold text-forest underline underline-offset-4">
                    Edit in basket
                  </Link>
                </p>
              </div>

              {stepError && <Notice tone="error" className="mt-5">{stepError}</Notice>}

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => goTo(2)} className={btn("outline", "lg")}>
                  Back
                </button>
                <button type="button" onClick={placeOrder} disabled={busy || quoteLoading || !quote.canCheckout || (hasChilled && !selectedSlot)} className={btn("primary", "lg", "flex-1 sm:flex-none")}>
                  {busy ? (
                    <>
                      <span className="spinner" /> Preparing your order…
                    </>
                  ) : (
                    <>
                      <Icon name="lock" className="h-4 w-4" /> Continue to payment · {formatPrice(quote.totalPence)}
                    </>
                  )}
                </button>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-charcoal/60">
                By continuing you agree to our{" "}
                <Link href="/legal/terms" className="underline underline-offset-2">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link href="/legal/returns" className="underline underline-offset-2">
                  Returns / Cancellation Policy
                </Link>
                .
              </p>
            </StepShell>
          )}

          {/* STEP 05 */}
          {step === 4 && order && (
            <StepShell index={4} title="Payment" intro={`Order ${order.reference} is reserved. Pay ${formatPrice(order.totalPence)} to confirm it.`}>
              <div aria-live="polite">
                {payState === "failed" && (
                  <Notice tone="error" title="Payment failed" className="mb-5">
                    {payError} Your basket and delivery choices have been kept.
                  </Notice>
                )}
                {payState === "processing" && (
                  <Notice title="Processing your payment" className="mb-5">
                    Please don&apos;t refresh or close this page.
                  </Notice>
                )}
              </div>

              {order.payment.mode === "stripe" ? (
                <div>
                  <div className="rounded-2xl border border-forest/10 bg-sage p-5 text-sm leading-relaxed text-charcoal/85">
                    <p className="flex items-center gap-2 font-semibold text-forest">
                      <Icon name="shield" className="h-5 w-5" /> Secure payment by Stripe
                    </p>
                    <p className="mt-2">You&apos;ll be taken to Stripe&apos;s secure payment page to enter your card details, then returned here for your confirmation. Curry Crafted never sees or stores your card number.</p>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" onClick={() => goTo(3)} disabled={payState === "processing"} className={btn("outline", "lg")}>
                      Back
                    </button>
                    <button type="button" onClick={payStripe} disabled={payState === "processing"} className={btn("primary", "lg", "flex-1 sm:flex-none")}>
                      {payState === "processing" ? <span className="spinner" /> : <Icon name="lock" className="h-4 w-4" />} Pay {formatPrice(order.totalPence)} with Stripe
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={payDemo} noValidate>
                  <div className="rounded-2xl border border-gold-muted/60 bg-gold/15 p-5 text-sm leading-relaxed text-charcoal">
                    <p className="flex items-center gap-2 font-bold text-forest">
                      <Icon name="info" className="h-5 w-5" /> Demo payment mode: no money is taken
                    </p>
                    <p className="mt-2">
                      Stripe isn&apos;t connected to this preview yet{stripeEnabled ? "" : " (no STRIPE_SECRET_KEY is configured)"}, so this form simulates the payment step. No card details are stored. Use Stripe&apos;s test card numbers:
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setCard({ cardNumber: "4242 4242 4242 4242", expiry: "12/34", cvc: "123" })} className={btn("outline", "sm")}>
                        Fill successful card
                      </button>
                      <button type="button" onClick={() => setCard({ cardNumber: "4000 0000 0000 0002", expiry: "12/34", cvc: "123" })} className={btn("outline", "sm")}>
                        Fill declined card
                      </button>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <Field label="Card number" htmlFor="cardNumber" error={errors.cardNumber} className="sm:col-span-2">
                      <input id="cardNumber" inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242" value={card.cardNumber} onChange={(e) => setCard({ ...card, cardNumber: e.target.value })} aria-invalid={errors.cardNumber ? true : undefined} className={cx(inputClass, "tabular-nums tracking-wider")} />
                    </Field>
                    <Field label="Expiry (MM/YY)" htmlFor="expiry" error={errors.expiry}>
                      <input id="expiry" inputMode="numeric" autoComplete="off" placeholder="12/34" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} aria-invalid={errors.expiry ? true : undefined} className={inputClass} />
                    </Field>
                    <Field label="Security code" htmlFor="cvc" error={errors.cvc}>
                      <input id="cvc" inputMode="numeric" autoComplete="off" placeholder="123" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} aria-invalid={errors.cvc ? true : undefined} className={inputClass} />
                    </Field>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" onClick={() => goTo(3)} disabled={payState === "processing" || payState === "success"} className={btn("outline", "lg")}>
                      Back
                    </button>
                    <button type="submit" disabled={payState === "processing" || payState === "success"} className={btn("primary", "lg", "flex-1 sm:flex-none")}>
                      {payState === "processing" || payState === "success" ? (
                        <>
                          <span className="spinner" /> {payState === "success" ? "Payment confirmed…" : "Processing…"}
                        </>
                      ) : (
                        <>
                          <Icon name="lock" className="h-4 w-4" /> {payState === "failed" ? "Try payment again" : "Pay"} {formatPrice(order.totalPence)}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </StepShell>
          )}
        </div>

        {/* Summary */}
        <aside aria-label="Order summary" className="h-fit rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
          <h2 className="display text-2xl text-forest">Order summary</h2>
          {!quote ? (
            <div className="skeleton mt-4 h-40" />
          ) : (
            <>
              <ul className="mt-4 divide-y divide-forest/10">
                {quote.lines.map((l) => (
                  <li key={l.key} className="flex items-center gap-3 py-3">
                    <span className="relative h-12 w-12 flex-none overflow-hidden rounded-lg bg-forest">
                      {l.image && <Image src={l.image} alt="" fill sizes="48px" className="object-cover" />}
                      <span className="absolute -right-0 -top-0 grid h-5 min-w-5 place-items-center rounded-bl-lg bg-gold px-1 text-[0.65rem] font-bold text-forest">{l.qty}</span>
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-semibold text-forest">{l.name}</span>
                      <span className="text-xs capitalize text-charcoal/60">{l.range}</span>
                    </span>
                    <span className="text-sm tabular-nums text-forest">{formatPrice(l.lineTotalPence)}</span>
                  </li>
                ))}
              </ul>
              <OrderTotals quote={quote} className="mt-4 border-t border-forest/10 pt-4" />
            </>
          )}
          <p className="mt-5 flex items-center gap-2 text-xs text-charcoal/65">
            <Icon name="lock" className="h-4 w-4 text-forest" /> Delivery charges are shown before you pay.
          </p>
        </aside>
      </div>
    </div>
  );
}

/** Empties the basket once an order is confirmed (covers customers returning from Stripe). */
export function ClearBasketOnce({ reference }: { reference: string }) {
  const { clearCart, hydrated } = useStore();
  useEffect(() => {
    if (!hydrated) return;
    const key = `cc_cleared_${reference}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    clearCart();
  }, [hydrated, reference, clearCart]);
  return null;
}
