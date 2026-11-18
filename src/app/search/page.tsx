import type { Metadata } from "next";
import { Catalogue } from "@/components/catalogue";
import { PageHero } from "@/components/ui";
import { getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search the menu" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const products = await getProducts();
  return (
    <>
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Search" }]}
        eyebrow="Search"
        title={q ? <>Results for <em className="text-gold">“{q.slice(0, 60)}”</em></> : <>Search <em className="text-gold">the Menu.</em></>}
        intro="Search by dish name, ingredient or category, then narrow things down by range, dietary need, spice level or price."
      />
      <section className="container-x py-10 md:py-14">
        <Catalogue key={q} products={products} initialQuery={q.slice(0, 60)} searchMode />
      </section>
    </>
  );
}
