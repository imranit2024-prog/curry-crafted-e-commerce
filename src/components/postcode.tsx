"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/types";
import { Modal } from "./client-ui";
import { useStore } from "./store";
import { Icon, RangeBadge, btn, cx } from "./ui";

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "invalid"; message: string } | { kind: "error"; message: string };

function usePostcodeForm(onChecked?: (chilled: boolean) => void) {
  const { postcode, checkPostcode } = useStore();
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [editing, setEditing] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status.kind === "loading") return;
    if (!value.trim()) return setStatus({ kind: "invalid", message: "Enter your postcode to check delivery." });
    setStatus({ kind: "loading" });
    const outcome = await checkPostcode(value);
    if (outcome.ok) {
      setStatus({ kind: "idle" });
      setEditing(false);
      setValue("");
      onChecked?.(outcome.result.chilled);
    } else setStatus({ kind: outcome.kind, message: outcome.error });
  };

  return { postcode, value, setValue, status, setStatus, editing, setEditing, submit };
}

function PostcodeFields({ form, tone, id }: { form: ReturnType<typeof usePostcodeForm>; tone: "light" | "dark"; id: string }) {
  const { value, setValue, status, setStatus, submit } = form;
  const bad = status.kind === "invalid" || status.kind === "error";
  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={id} className={cx("mb-2 block text-sm font-semibold", tone === "dark" ? "text-cream" : "text-forest")}>
        Your postcode
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Icon name="pin" className={cx("pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2", tone === "dark" ? "text-gold" : "text-forest/60")} />
          <input
            id={id}
            data-autofocus
            type="text"
            inputMode="text"
            autoComplete="postal-code"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={9}
            value={value}
            onChange={(e) => {
              setValue(e.target.value.toUpperCase());
              if (bad) setStatus({ kind: "idle" });
            }}
            placeholder="e.g. DY9 8DU"
            aria-invalid={bad || undefined}
            aria-describedby={bad ? `${id}-error` : undefined}
            className={cx(
              "h-14 w-full rounded-full border pl-12 pr-5 text-base font-semibold uppercase tracking-[0.12em] placeholder:font-medium placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-gold/70",
              tone === "dark" ? "border-cream/25 bg-cream/5 text-cream placeholder:text-cream/45 focus:border-gold" : "border-forest/20 bg-white text-forest placeholder:text-charcoal/45 focus:border-forest",
              bad && (tone === "dark" ? "border-gold-soft" : "border-danger"),
            )}
          />
        </div>
        <button type="submit" disabled={status.kind === "loading"} className={btn(tone === "dark" ? "gold" : "primary", "lg", "sm:flex-none")}>
          {status.kind === "loading" ? (
            <>
              <span className="spinner" /> Checking…
            </>
          ) : (
            "Check Availability"
          )}
        </button>
      </div>
      <div aria-live="polite" className="min-h-6">
        {bad && (
          <p id={`${id}-error`} role="alert" className={cx("mt-2.5 flex items-start gap-2 text-sm font-medium", tone === "dark" ? "text-gold-soft" : "text-danger")}>
            <Icon name="alert" className="mt-0.5 h-4 w-4 flex-none" />
            {status.message}
          </p>
        )}
      </div>
    </form>
  );
}

function RangeTile({ range, state, title, body, href, cta, tone }: { range: "chilled" | "frozen"; state: "yes" | "no" | "unknown"; title: string; body: string; href?: string; cta?: string; tone: "light" | "dark" }) {
  return (
    <div
      className={cx(
        "flex h-full flex-col rounded-2xl border p-5 transition-colors duration-500",
        tone === "dark" ? "border-cream/15 bg-cream/5" : state === "yes" ? "border-forest/20 bg-sage" : state === "no" ? "border-forest/10 bg-cream" : "border-forest/10 bg-white",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <RangeBadge range={range} />
        <span
          key={state}
          className={cx(
            "pop inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider",
            state === "yes" && "bg-forest text-gold",
            state === "no" && "bg-charcoal/10 text-charcoal",
            state === "unknown" && (tone === "dark" ? "bg-cream/10 text-cream/80" : "bg-forest/5 text-forest/75"),
          )}
        >
          <Icon name={state === "yes" ? "check" : state === "no" ? "close" : "info"} className="h-3 w-3" />
          {state === "yes" ? "Available" : state === "no" ? "Unavailable" : range === "chilled" ? "Check postcode" : "UK-wide"}
        </span>
      </div>
      <p className={cx("mt-4 font-semibold", tone === "dark" ? "text-cream" : "text-forest")}>{title}</p>
      <p className={cx("mt-1 flex-1 text-sm leading-relaxed", tone === "dark" ? "text-cream/75" : "text-charcoal/75")}>{body}</p>
      {href && cta && (
        <Link href={href} className={cx("mt-4 inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline", tone === "dark" ? "text-gold" : "text-forest")}>
          {cta} <Icon name="arrow-right" className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/** Inline postcode checker used on the homepage, collection pages and delivery page. */
export function PostcodeChecker({ tone = "light", id = "postcode-check", showTiles = true }: { tone?: "light" | "dark"; id?: string; showTiles?: boolean }) {
  const form = usePostcodeForm();
  const { postcode, editing, setEditing } = form;
  const showForm = !postcode || editing;

  return (
    <div>
      {showForm ? (
        <PostcodeFields form={form} tone={tone} id={id} />
      ) : (
        <div className={cx("flex flex-wrap items-center justify-between gap-3 rounded-full border py-2 pl-5 pr-2", tone === "dark" ? "border-cream/20 bg-cream/5 text-cream" : "border-forest/15 bg-white text-forest")} role="status">
          <p className="flex items-center gap-2.5 text-sm">
            <Icon name="pin" className={cx("h-5 w-5 flex-none", tone === "dark" ? "text-gold" : "text-forest/60")} />
            Showing delivery options for <strong className="text-base font-bold tracking-[0.1em]">{postcode.postcode}</strong>
          </p>
          <button type="button" onClick={() => setEditing(true)} className={btn(tone === "dark" ? "outline-light" : "outline", "sm")}>
            Change postcode
          </button>
        </div>
      )}

      {showTiles && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {postcode && !editing ? (
            <>
              <RangeTile
                tone={tone}
                range="chilled"
                state={postcode.chilled ? "yes" : "no"}
                title={postcode.chilled ? "Chilled delivery is available" : "Chilled delivery isn't available here yet"}
                body={
                  postcode.chilled
                    ? `Good news. We deliver chilled meals to ${postcode.postcode}. Choose your delivery day and time slot at checkout.`
                    : `Chilled meals are delivered by our own refrigerated service to selected postcodes only, and ${postcode.postcode} is outside that area.`
                }
                href={postcode.chilled ? "/chilled" : undefined}
                cta="Explore chilled meals"
              />
              <RangeTile
                tone={tone}
                range="frozen"
                state={postcode.frozen ? "yes" : "no"}
                title={postcode.frozen ? "Frozen delivery is available" : "Frozen delivery isn't available here"}
                body={
                  postcode.frozen
                    ? `We deliver frozen meals to ${postcode.postcode} by tracked courier.${postcode.frozenSurchargePence ? ` ${postcode.frozenNote ?? ""} A ${formatPrice(postcode.frozenSurchargePence)} surcharge applies.` : ""}`
                    : (postcode.frozenNote ?? "This postcode is outside our frozen courier coverage.")
                }
                href={postcode.frozen ? "/frozen" : undefined}
                cta={postcode.chilled ? "Explore frozen range" : "Shop frozen instead"}
              />
            </>
          ) : (
            <>
              <RangeTile tone={tone} range="chilled" state="unknown" title="Selected postcodes only" body="Chilled meals travel in our own refrigerated delivery service, so they're available in the areas we cover. Enter your postcode to find out." />
              <RangeTile tone={tone} range="frozen" state="unknown" title="Delivered UK-wide" body="Frozen meals are sent by tracked courier across the UK. A small number of remote postcodes carry a surcharge or can't be reached." />
            </>
          )}
        </div>
      )}
      <p className={cx("mt-4 text-xs leading-relaxed", tone === "dark" ? "text-cream/55" : "text-charcoal/60")}>
        Preview coverage is sample data. Try <strong>DY9 8DU</strong> (chilled and frozen) or <strong>EH1 1YZ</strong> (frozen only).
      </p>
    </div>
  );
}

/** Opens whenever a chilled purchase is attempted before a postcode has been validated. */
export function PostcodeModal() {
  const { postcodePrompt, closePostcodePrompt, toast, postcode } = useStore();
  const [declined, setDeclined] = useState<string | null>(null);
  const pending = postcodePrompt.pending;

  const close = () => {
    setDeclined(null);
    closePostcodePrompt();
  };

  const form = usePostcodeForm((chilled) => {
    if (pending) {
      if (chilled) {
        pending();
        close();
      } else setDeclined("pending");
    } else {
      toast(chilled ? "Chilled and frozen delivery are both available for your postcode." : "Frozen delivery is available for your postcode. Chilled delivery isn't available there yet.", "info");
      close();
    }
  });

  return (
    <Modal open={postcodePrompt.open} onClose={close} title={declined ? "Chilled isn't available here yet" : "Can we deliver to you?"}>
      {declined && postcode ? (
        <div>
          <p className="text-sm leading-relaxed text-charcoal/80">
            Sorry, <strong className="text-forest">{postcode.postcode}</strong> is outside our chilled delivery area, so this dish can&apos;t be added to your basket.
            {postcode.frozen && " The good news: our frozen range is delivered to your postcode."}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {postcode.frozen && (
              <Link href="/frozen" onClick={close} className={btn("primary", "md", "flex-1")}>
                Shop the frozen range
              </Link>
            )}
            <button type="button" onClick={() => setDeclined(null)} className={btn("outline", "md", "flex-1")}>
              Try another postcode
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-5 text-sm leading-relaxed text-charcoal/80">
            {postcodePrompt.reason ?? "Enter your postcode and we'll show which Curry Crafted meals are available in your area. Chilled is delivered to selected postcodes; frozen is delivered UK-wide."}
          </p>
          <PostcodeFields form={form} tone="light" id="postcode-modal" />
          <p className="text-xs text-charcoal/60">
            Preview coverage is sample data. Try <strong>DY9 8DU</strong> or <strong>EH1 1YZ</strong>.
          </p>
        </div>
      )}
    </Modal>
  );
}

/** Small contextual message about chilled eligibility for the saved postcode. */
export function ChilledStatus({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const { postcode, requestPostcode } = useStore();
  const text = tone === "dark" ? "text-cream/85" : "text-charcoal/80";
  const link = tone === "dark" ? "text-gold" : "text-forest";
  return (
    <p className={cx("flex items-start gap-2 text-sm leading-relaxed", text, className)} aria-live="polite">
      <Icon name={postcode ? (postcode.chilled ? "check" : "info") : "pin"} className={cx("mt-0.5 h-4 w-4 flex-none", link)} />
      <span>
        {!postcode && "Delivered to selected postcodes. "}
        {postcode?.chilled && `Available for delivery to ${postcode.postcode}. `}
        {postcode && !postcode.chilled && `Not available for ${postcode.postcode}. `}
        <button type="button" onClick={() => requestPostcode()} className={cx("font-semibold underline underline-offset-4", link)}>
          {postcode ? "Change postcode" : "Check your postcode"}
        </button>
      </span>
    </p>
  );
}
