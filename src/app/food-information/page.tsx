import type { Metadata } from "next";
import Link from "next/link";
import { InfoCard } from "@/components/blocks";
import { PageHero, RangeBadge, SampleNote } from "@/components/ui";
import { getProducts } from "@/lib/catalog";
import { getConfig } from "@/lib/config";
import { ALLERGENS, DIETARY } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Allergen & food information", description: "Allergens, ingredients, dietary and nutritional information for every Curry Crafted dish, plus storage and preparation guidance." };

export default async function FoodInformationPage() {
  const [products, config] = await Promise.all([getProducts(), getConfig()]);
  const sorted = [...products].sort((a, b) => a.range.localeCompare(b.range) || a.name.localeCompare(b.name));
  const keys = Object.keys(ALLERGENS);
  const withNutrition = sorted.filter((p) => p.nutrition);

  return (
    <>
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Allergen & Food Information" }]}
        eyebrow="Food information"
        title={<>Know Exactly <em className="text-gold">What You&apos;re Eating.</em></>}
        intro="Allergens, ingredients, dietary suitability, nutrition, storage and preparation for every dish. The same information appears on each product page before you add it to your basket."
      />

      <div className="container-x space-y-16 py-12 md:py-16">
        <SampleNote className="max-w-3xl">All food information on this page is sample data for the preview. It must be replaced with verified Curry Crafted ingredient, allergen and nutritional data before the site goes live.</SampleNote>

        <section aria-labelledby="allergy-heading" className="rounded-3xl border border-forest/15 bg-white p-6 md:p-8">
          <h2 id="allergy-heading" className="display text-3xl text-forest">If you have a food allergy or intolerance</h2>
          <div className="mt-4 grid gap-6 text-sm leading-relaxed text-charcoal/85 md:grid-cols-2">
            <p>All our dishes are prepared in one kitchen that handles the 14 major allergens. We take care to keep ingredients separate, but we can&apos;t guarantee any dish is completely free from traces of an allergen.</p>
            <p>
              Always check the ingredients list on the product page and on the pack label when your order arrives, because recipes can change. If you&apos;re unsure, please{" "}
              <Link href="/contact" className="font-semibold text-forest underline underline-offset-4">contact us</Link> before ordering ({config.contact.email}).
            </p>
          </div>
        </section>

        <section aria-labelledby="matrix-heading">
          <h2 id="matrix-heading" className="display text-3xl text-forest md:text-4xl">Allergen information by dish</h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-charcoal/80">
            <span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-forest text-[0.6rem] font-bold text-gold">C</span> Contains</span>
            <span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full border border-forest/40 text-[0.6rem] font-bold text-forest">M</span> May contain</span>
            <span className="text-charcoal/60">Scroll sideways on small screens.</span>
          </p>
          <div className="relative mt-5 overflow-x-auto rounded-3xl bg-white shadow-[var(--shadow-card)]" tabIndex={0} role="region" aria-label="Allergen table">
            <table className="w-full min-w-[60rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-forest/15">
                  <th scope="col" className="sticky left-0 z-10 bg-white px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-charcoal/60">Dish</th>
                  {keys.map((k) => (
                    <th key={k} scope="col" className="h-36 px-1 pb-3 align-bottom">
                      <span className="mx-auto block w-5 rotate-180 whitespace-nowrap text-left text-xs font-semibold text-forest [writing-mode:vertical-rl]">{ALLERGENS[k]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id} className="border-b border-forest/5 last:border-0 hover:bg-sage/50">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-5 py-3 text-left font-medium">
                      <Link href={`/products/${p.slug}`} className="font-semibold text-forest underline-offset-4 hover:underline">{p.name}</Link>
                      <span className="mt-1 block"><RangeBadge range={p.range} size="sm" /></span>
                    </th>
                    {keys.map((k) => {
                      const contains = p.allergens.includes(k);
                      const may = !contains && p.mayContain.includes(k);
                      return (
                        <td key={k} className="px-1 py-3 text-center">
                          {contains && <span className="mx-auto grid h-6 w-6 place-items-center rounded-full bg-forest text-[0.6rem] font-bold text-gold" title={`Contains ${ALLERGENS[k]}`}>C<span className="sr-only">ontains</span></span>}
                          {may && <span className="mx-auto grid h-6 w-6 place-items-center rounded-full border border-forest/40 text-[0.6rem] font-bold text-forest" title={`May contain ${ALLERGENS[k]}`}>M<span className="sr-only">ay contain</span></span>}
                          {!contains && !may && <span className="text-charcoal/25" aria-label="Not listed">·</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="dietary-heading">
          <h2 id="dietary-heading" className="display text-3xl text-forest md:text-4xl">Dietary information</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {Object.entries(DIETARY).map(([key, d]) => {
              const list = sorted.filter((p) => p.dietary.includes(key));
              return (
                <div key={key} className="rounded-3xl bg-white p-6 shadow-[var(--shadow-card)]">
                  <h3 className="display text-2xl text-forest">{d.label}</h3>
                  {list.length ? (
                    <ul className="mt-4 space-y-2 text-sm">
                      {list.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3">
                          <Link href={`/products/${p.slug}`} className="font-medium text-forest underline-offset-4 hover:underline">{p.name}</Link>
                          <span className="text-xs capitalize text-charcoal/60">{p.range}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-charcoal/70">No dishes are currently verified for this category.</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading" className="display text-3xl text-forest md:text-4xl">Ingredients</h2>
          <p className="mt-2 text-sm text-charcoal/75">Allergens are shown in bold in each ingredients list.</p>
          <div className="mt-5 rounded-3xl bg-white px-5 shadow-[var(--shadow-card)] md:px-7">
            {sorted.map((p) => (
              <details key={p.id} className="group border-b border-forest/10 last:border-0">
                <summary className="flex min-h-14 items-center justify-between gap-4 py-3">
                  <span className="flex flex-wrap items-center gap-3 font-semibold text-forest">{p.name} <RangeBadge range={p.range} size="sm" /></span>
                  <span className="text-xl leading-none text-forest transition-transform duration-300 group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="pb-5 text-sm leading-relaxed text-charcoal/85">
                  {p.ingredients.split("**").map((part, i) => (i % 2 === 1 ? <strong key={i} className="text-forest">{part}</strong> : <span key={i}>{part}</span>))}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="nutrition-heading">
          <h2 id="nutrition-heading" className="display text-3xl text-forest md:text-4xl">Nutritional information</h2>
          <p className="mt-2 text-sm text-charcoal/75">Typical values per 100g, shown where supplied.</p>
          <div className="relative mt-5 overflow-x-auto rounded-3xl bg-white shadow-[var(--shadow-card)]" tabIndex={0} role="region" aria-label="Nutrition table">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-forest/15 text-xs font-semibold uppercase tracking-wider text-charcoal/60">
                  <th scope="col" className="px-5 py-4 text-left">Dish</th>
                  {["Energy (kcal)", "Fat (g)", "Saturates (g)", "Carbs (g)", "Sugars (g)", "Protein (g)", "Salt (g)"].map((h) => <th key={h} scope="col" className="px-3 py-4 text-right">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {withNutrition.map((p) => (
                  <tr key={p.id} className="border-b border-forest/5 last:border-0">
                    <th scope="row" className="px-5 py-3 text-left font-semibold text-forest">{p.name}</th>
                    {[p.nutrition!.energyKcal, p.nutrition!.fat, p.nutrition!.saturates, p.nutrition!.carbs, p.nutrition!.sugars, p.nutrition!.protein, p.nutrition!.salt].map((v, i) => <td key={i} className="px-3 py-3 text-right tabular-nums text-charcoal/85">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sorted.length > withNutrition.length && <p className="mt-3 text-sm text-charcoal/70">Nutritional information has not yet been supplied for: {sorted.filter((p) => !p.nutrition).map((p) => p.name).join(", ")}.</p>}
        </section>

        <section aria-labelledby="storage-heading">
          <h2 id="storage-heading" className="display text-3xl text-forest md:text-4xl">Storage &amp; preparation</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <InfoCard icon="drop" title="Chilled storage guidance">
              <p>Refrigerate at 5°C or below as soon as your delivery arrives and eat by the use-by date on the pack.</p>
              <p>Once opened, eat within 24 hours. Suitable for home freezing on the day of delivery; use within one month and defrost fully in the fridge.</p>
            </InfoCard>
            <InfoCard icon="snowflake" title="Frozen storage guidance">
              <p>Place in the freezer on arrival and keep at -18°C or below until the best-before date.</p>
              <p>If a product has defrosted, keep it refrigerated, use within 24 hours and do not refreeze.</p>
            </InfoCard>
            <InfoCard icon="flame" title="Preparation instructions">
              <p>Chilled mains heat in 4–5 minutes in the microwave or 6–8 minutes on the hob. Frozen mains cook from frozen in 8–9 minutes in the microwave or 35–40 minutes in the oven.</p>
              <p>Always check food is piping hot throughout. Dish-specific instructions are on each product page.</p>
            </InfoCard>
          </div>
        </section>
      </div>
    </>
  );
}
