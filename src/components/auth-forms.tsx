"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { PasswordInput } from "./client-ui";
import { useStore } from "./store";
import { Field, Icon, Notice, btn, cx, inputClass } from "./ui";

type Errors = Record<string, string>;

async function post(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, data: await res.json() };
  } catch {
    return { ok: false, data: { error: "We couldn't reach the server. Check your connection and try again." } };
  }
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { setUser, toast } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");
  const lock = useRef(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    const fields: Errors = {};
    if (!email.trim()) fields.email = "Enter your email address.";
    if (!password) fields.password = "Enter your password.";
    setErrors(fields);
    setFormError(null);
    if (Object.keys(fields).length) return;
    lock.current = true;
    setState("loading");
    const { ok, data } = await post("/api/auth/login", { email, password });
    if (!ok) {
      lock.current = false;
      setState("idle");
      setErrors((data.fields as Errors) ?? {});
      setFormError(String(data.error ?? "Sign in failed."));
      return;
    }
    setState("success");
    setUser(data.user as never);
    toast("Welcome back. You're signed in.");
    router.push(next);
    router.refresh();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {formError && <Notice tone="error">{formError}</Notice>}
      {state === "success" && <Notice tone="success" title="Signed in">Taking you to your account…</Notice>}
      <Field label="Email" htmlFor="email" error={errors.email}>
        <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "email-error" : undefined} className={inputClass} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password}>
        <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" invalid={Boolean(errors.password)} className={inputClass} />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-forest underline underline-offset-4">
          Forgot password?
        </Link>
      </div>
      <button type="submit" disabled={state !== "idle"} className={btn("primary", "lg", "w-full")}>
        {state === "loading" ? (
          <>
            <span className="spinner" /> Signing in…
          </>
        ) : state === "success" ? (
          <>
            <Icon name="check" className="h-4 w-4" /> Signed in
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}

export function RegisterForm({ next, referralCode }: { next: string; referralCode: string }) {
  const router = useRouter();
  const { setUser, toast } = useStore();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "", referralCode, marketingEmail: false });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");
  const lock = useRef(false);
  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    const fields: Errors = {};
    if (form.name.trim().length < 2) fields.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) fields.email = "Enter a valid email address.";
    if (!/^[0-9+()\s-]{7,20}$/.test(form.phone.trim())) fields.phone = "Enter a valid telephone number.";
    if (form.password.length < 8) fields.password = "Use at least 8 characters.";
    if (form.confirmPassword !== form.password) fields.confirmPassword = "Passwords don't match.";
    setErrors(fields);
    setFormError(null);
    if (Object.keys(fields).length) {
      document.getElementById(Object.keys(fields)[0])?.focus();
      return;
    }
    lock.current = true;
    setState("loading");
    const { ok, data } = await post("/api/auth/register", form);
    if (!ok) {
      lock.current = false;
      setState("idle");
      setErrors((data.fields as Errors) ?? {});
      setFormError(String(data.error ?? "We couldn't create your account."));
      return;
    }
    setState("success");
    setUser(data.user as never);
    toast("Welcome to Curry Crafted. Your account is ready.");
    router.push(next);
    router.refresh();
  };

  const text = (id: "name" | "email" | "phone" | "referralCode", props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input id={id} name={id} value={form[id]} onChange={(e) => set(id, e.target.value)} aria-invalid={errors[id] ? true : undefined} aria-describedby={errors[id] ? `${id}-error` : undefined} className={inputClass} {...props} />
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      {formError && (
        <Notice tone="error" className="sm:col-span-2">
          {formError}
        </Notice>
      )}
      {state === "success" && (
        <Notice tone="success" title="Account created" className="sm:col-span-2">
          Taking you to your dashboard…
        </Notice>
      )}
      <Field label="Full name" htmlFor="name" error={errors.name} className="sm:col-span-2">
        {text("name", { autoComplete: "name" })}
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email}>
        {text("email", { type: "email", autoComplete: "email" })}
      </Field>
      <Field label="Telephone" htmlFor="phone" error={errors.phone}>
        {text("phone", { type: "tel", autoComplete: "tel" })}
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters.">
        <PasswordInput id="password" value={form.password} onChange={(v) => set("password", v)} autoComplete="new-password" invalid={Boolean(errors.password)} className={inputClass} />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword}>
        <PasswordInput id="confirmPassword" value={form.confirmPassword} onChange={(v) => set("confirmPassword", v)} autoComplete="new-password" invalid={Boolean(errors.confirmPassword)} className={inputClass} />
      </Field>
      <Field label="Referral code (optional)" htmlFor="referralCode" error={errors.referralCode} hint="Joining through a friend? Enter their code." className="sm:col-span-2">
        {text("referralCode", { autoComplete: "off", className: cx(inputClass, "uppercase tracking-wider") })}
      </Field>
      <label className="flex items-start gap-3 text-sm leading-relaxed text-charcoal/85 sm:col-span-2">
        <input type="checkbox" checked={form.marketingEmail} onChange={(e) => set("marketingEmail", e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-[#0F2418]" />
        <span>Email me Curry Crafted news and offers. Optional, and you can change this at any time in your account.</span>
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={state !== "idle"} className={btn("primary", "lg", "w-full")}>
          {state === "loading" ? (
            <>
              <span className="spinner" /> Creating your account…
            </>
          ) : state === "success" ? (
            <>
              <Icon name="check" className="h-4 w-4" /> Account created
            </>
          ) : (
            "Create account"
          )}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-charcoal/60">
          By creating an account you agree to our{" "}
          <Link href="/legal/terms" className="underline underline-offset-2">
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </form>
  );
}

/** Password reset depends on the transactional email service, which is a pending integration. */
export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError("Enter the email address you registered with.");
    setError(null);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Notice title="Reset emails aren't connected yet">
        <p>
          In the live site, a reset link would now be emailed to <strong>{email}</strong> if an account exists. The email service hasn&apos;t been connected to this preview, so no email has been sent.
        </p>
        <p className="mt-2">
          Need access now?{" "}
          <Link href="/contact" className="font-semibold text-forest underline underline-offset-4">
            Contact us
          </Link>{" "}
          and we&apos;ll help.
        </p>
      </Notice>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Email" htmlFor="email" error={error}>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "email-error" : undefined} className={inputClass} />
      </Field>
      <button type="submit" className={btn("primary", "lg", "w-full")}>
        Send reset link
      </button>
    </form>
  );
}
