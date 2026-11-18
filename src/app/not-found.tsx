import Link from "next/link";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <section className="container-x py-24 text-center md:py-32">
      <p className="eyebrow text-forest/65">Page not found</p>
      <h1 className="display mt-4 text-[clamp(2.6rem,7vw,5rem)] text-forest">This dish isn&apos;t on the menu.</h1>
      <p className="mx-auto mt-4 max-w-md text-base text-charcoal/75">The page you&apos;re looking for has moved or no longer exists.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className={btn("primary", "lg")}>Browse the menu</Link>
        <Link href="/" className={btn("outline", "lg")}>Back to home</Link>
      </div>
    </section>
  );
}
