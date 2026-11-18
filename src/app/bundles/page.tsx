import type { Metadata } from "next";
import { BundleBuilder } from "@/components/bundle-builder";
import { PageHero } from "@/components/ui";
import { getBundles, getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meal bundles: build your box", description: "Choose a bundle, pick your mains and sides, and save against buying separately." };

export default async function BundlesPage({ searchParams }: { searchParams: Promise<{ bundle?: string; range?: string }> }) {
  const sp = await searchParams;
  const [bundles, products] = await Promise.all([getBundles(), getProducts()]);
  return (
    <>
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: "Meal Bundles" }]}
        eyebrow="Build your box"
        title={
          <>
            Make Every Meal a Little <em className="text-gold">More Special.</em>
          </>
        }
        intro="Pick a bundle, fill it with the mains and sides you love, and watch your saving add up. One fixed price, your choice of dishes."
      />
      <section className="container-x py-10 md:py-14" aria-label="Bundle builder">
        <BundleBuilder key={`${sp.bundle ?? ""}-${sp.range ?? ""}`} bundles={bundles} products={products} initialSlug={sp.bundle} initialRange={sp.range === "frozen" ? "frozen" : sp.range === "chilled" ? "chilled" : undefined} />
      </section>
    </>
  );
}
