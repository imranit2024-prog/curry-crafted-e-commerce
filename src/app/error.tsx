"use client";

import Link from "next/link";
import { useEffect } from "react";
import { btn } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="container-x py-24 text-center md:py-32">
      <p className="eyebrow text-forest/65">Something went wrong</p>
      <h1 className="display mt-4 text-[clamp(2.4rem,6vw,4.5rem)] text-forest">We couldn&apos;t load this page.</h1>
      <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-charcoal/75">
        Our kitchen systems didn&apos;t respond in time. Your basket is saved in this browser, so nothing has been lost. Please try again in a moment.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className={btn("primary", "lg")}>
          Try again
        </button>
        <Link href="/" className={btn("outline", "lg")}>
          Back to home
        </Link>
      </div>
    </section>
  );
}
