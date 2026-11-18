import type { Metadata } from "next";
import { Catalogue } from "@/components/catalogue";
import { PageHero } from "@/components/ui";
import { getProducts } from "@/lib/catalog";
import { categoryLabel } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop all chilled & frozen meals" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string; range?: string }> }) {
  const sp = await searchParams;
  const products = await getProducts();
  const category = sp.category ?? "all";
  const range = sp.range === "chilled" || sp.range === "frozen" ? sp.range : "all";
  return (
    <>
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
        eyebrow="The full menu"
        title={
          <>
            Shop <em className="text-gold">Every Dish.</em>
          </>
        }
        intro="Curries, sides and accompaniments from our kitchen. Every dish is clearly marked Chilled or Frozen, because the two ranges are delivered differently."
      />
      <section className="container-x py-10 md:py-14">
        <h2 className="sr-only">{category !== "all" ? `${categoryLabel(category)} dishes` : "All products"}</h2>
        <Catalogue key={`${category}-${range}-${sp.q ?? ""}`} products={products} initialCategory={category} initialQuery={sp.q ?? ""} initialRange={range} />
      </section>
    </>
  );
}
