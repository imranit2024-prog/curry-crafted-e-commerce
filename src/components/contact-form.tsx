"use client";

import { useRef, useState, type FormEvent } from "react";
import { Field, Icon, Notice, btn, cx, inputClass } from "./ui";

const TOPICS = ["General enquiry", "An existing order", "Chilled delivery", "Frozen delivery", "Allergens & food information", "Rewards & referrals", "Something else"];

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", topic: TOPICS[0], message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const lock = useRef(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    const fields: Record<string, string> = {};
    if (form.name.trim().length < 2) fields.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) fields.email = "Enter a valid email address.";
    if (form.message.trim().length < 10) fields.message = "Tell us a little more so we can help (at least 10 characters).";
    setErrors(fields);
    setFormError(null);
    if (Object.keys(fields).length) return;
    lock.current = true;
    setState("loading");
    try {
      const res = await fetch("/api/forms/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setFormError(data.error ?? "Something went wrong. Please try again.");
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setFormError("We couldn't reach the server. Check your connection and try again.");
      setState("idle");
    } finally {
      lock.current = false;
    }
  };

  if (state === "done") {
    return (
      <div role="status" className="rounded-3xl bg-sage p-8 text-center">
        <span className="pop mx-auto grid h-14 w-14 place-items-center rounded-full bg-forest text-gold">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <p className="display mt-5 text-3xl text-forest">Message received</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-charcoal/80">Thank you, {form.name.split(" ")[0]}. Your message has been saved for the Curry Crafted team, who will reply to {form.email}.</p>
        <button type="button" onClick={() => { setForm({ name: "", email: "", topic: TOPICS[0], message: "" }); setState("idle"); }} className={btn("outline", "sm", "mt-6")}>
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      {formError && <Notice tone="error" className="sm:col-span-2">{formError}</Notice>}
      <Field label="Your name" htmlFor="c-name" error={errors.name}>
        <input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" aria-invalid={errors.name ? true : undefined} className={inputClass} />
      </Field>
      <Field label="Email" htmlFor="c-email" error={errors.email}>
        <input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" aria-invalid={errors.email ? true : undefined} className={inputClass} />
      </Field>
      <Field label="What's it about?" htmlFor="c-topic" className="sm:col-span-2">
        <div className="relative">
          <select id="c-topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className={cx(inputClass, "appearance-none pr-11")}>
            {TOPICS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <Icon name="chevron-down" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-forest" />
        </div>
      </Field>
      <Field label="Message" htmlFor="c-message" error={errors.message} className="sm:col-span-2">
        <textarea id="c-message" rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} aria-invalid={errors.message ? true : undefined} className={cx(inputClass, "h-auto py-3 leading-relaxed")} />
      </Field>
      <div className="sm:col-span-2">
        <button type="submit" disabled={state === "loading"} className={btn("primary", "lg")}>
          {state === "loading" ? <><span className="spinner" /> Sending…</> : "Send message"}
        </button>
      </div>
    </form>
  );
}
