import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { SectionHeading } from "@/components/blocks";
import { ProductCard } from "@/components/product-card";
import { BoughtTogether, Gallery, PurchasePanel } from "@/components/product-detail";
import { Breadcrumbs, DietaryTags, Icon, RangeBadge, SampleNote, SpiceLevel } from "@/components/ui";
import { getProductBySlug, getProducts } from "@/lib/catalog";
import { ALLERGENS, MAIN_CATEGORIES, categoryLabel, rangeLabel } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return product ? { title: `${product.name} (${rangeLabel(product.range)})`, description: product.shortDescription } : { title: "Dish not found" };
}

function Ingredients({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed text-charcoal/85">
      {text.split("**").map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-bold text-forest">{part}</strong> : <Fragment key={i}>{part}</Fragment>))}
    </p>
  );
}

function Panel({ title, icon, open = false, children }: { title: string; icon: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group border-b border-forest/15">
      <summary className="flex min-h-14 items-center justify-between gap-4 py-4 text-left font-semibold text-forest">
        <span className="flex items-center gap-3">
          <Icon name={icon} className="h-5 w-5 text-forest/70" /> {title}
        </span>
        <Icon name="chevron-down" className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <div className="pb-6">{children}</div>
    </details>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, all] = await Promise.all([getProductBySlug(slug), getProducts()]);
  if (!product) notFound();

  const sameRange = all.filter((p) => p.range === product.range && p.id !== product.id);
  const isMain = MAIN_CATEGORIES.includes(product.category);
  const companions = sameRange.filter((p) => p.available && (isMain ? !MAIN_CATEGORIES.includes(p.category) : MAIN_CATEGORIES.includes(p.category))).slice(0, 2);
  const related = [...sameRange.filter((p) => p.category === product.category), ...sameRange.filter((p) => p.category !== product.category && MAIN_CATEGORIES.includes(p.category) === isMain)].slice(0, 4);
  const chilled = product.range === "chilled";
  const nutritionRows = product.nutrition
    ? [
        ["Energy", `${product.nutrition.energyKcal} kcal`],
        ["Fat", `${product.nutrition.fat} g`],
        ["of which saturates", `${product.nutrition.saturates} g`],
        ["Carbohydrate", `${product.nutrition.carbs} g`],
        ["of which sugars", `${product.nutrition.sugars} g`],
        ["Protein", `${product.nutrition.protein} g`],
        ["Salt", `${product.nutrition.salt} g`],
      ]
    : null;

  return (
    <div className="pb-24 lg:pb-0">
      <div className="container-x pt-6 md:pt-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
            { label: rangeLabel(product.range), href: `/${product.range}` },
            { label: product.name },
          ]}
        />
      </div>

      <section className="container-x grid gap-8 py-8 md:py-10 lg:grid-cols-2 lg:gap-16">
        <Gallery images={product.gallery} name={product.name} available={product.available} />

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <RangeBadge range={product.range} />
            <Link href={`/shop?category=${product.category}`} className="eyebrow text-forest/65 underline-offset-4 hover:underline">
              {categoryLabel(product.category)}
            </Link>
          </div>
          <h1 className="display mt-4 text-[clamp(2.4rem,5vw,4rem)] text-forest">{product.name}</h1>
          <p className="mt-4 text-lg leading-relaxed text-charcoal/80">{product.shortDescription}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <SpiceLevel level={product.spiceLevel} />
            <DietaryTags dietary={product.dietary} />
            {product.servings && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-charcoal/75">
                <Icon name="users" className="h-4 w-4" /> {product.servings}
              </span>
            )}
          </div>

          {/* Allergens are shown before the purchase controls */}
          <div className="mt-6 rounded-2xl border border-forest/15 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-forest">
              <Icon name="alert" className="h-4 w-4" /> Allergens
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-charcoal/85">
              {product.allergens.length ? (
                <>
                  Contains: <strong className="text-forest">{product.allergens.map((a) => ALLERGENS[a] ?? a).join(", ")}</strong>.
                </>
              ) : (
                "No allergens are listed as ingredients in this dish."
              )}{" "}
              {product.mayContain.length > 0 && <>May contain: {product.mayContain.map((a) => ALLERGENS[a] ?? a).join(", ")}. </>}
              <a href="#food-information" className="font-semibold text-forest underline underline-offset-4">
                Full ingredients
              </a>
            </p>
          </div>

          <div className="mt-7 border-t border-forest/15 pt-7">
            <PurchasePanel product={product} />
          </div>

          <div id="food-information" className="mt-10 scroll-mt-28 border-t border-forest/15">
            <Panel title="About this dish" icon="sparkle" open>
              <p className="text-sm leading-relaxed text-charcoal/85">{product.description}</p>
            </Panel>
            <Panel title="Ingredients" icon="list" open>
              <Ingredients text={product.ingredients} />
              <p className="mt-2 text-xs text-charcoal/65">Allergens are shown in bold.</p>
            </Panel>
            <Panel title="Allergen information" icon="alert">
              <dl className="space-y-2 text-sm text-charcoal/85">
                <div>
                  <dt className="font-semibold text-forest">Contains</dt>
                  <dd>{product.allergens.length ? product.allergens.map((a) => ALLERGENS[a] ?? a).join(", ") : "None of the 14 major allergens as ingredients"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-forest">May contain</dt>
                  <dd>{product.mayContain.length ? product.mayContain.map((a) => ALLERGENS[a] ?? a).join(", ") : "No precautionary allergen statement"}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm leading-relaxed text-charcoal/75">
                All dishes are prepared in a kitchen that handles the 14 major allergens.{" "}
                <Link href="/food-information" className="font-semibold text-forest underline underline-offset-4">
                  See allergen information for every dish
                </Link>
                .
              </p>
            </Panel>
            <Panel title="Nutritional information" icon="info">
              {nutritionRows ? (
                <table className="w-full text-sm">
                  <caption className="mb-2 text-left text-xs text-charcoal/65">Typical values per 100g</caption>
                  <tbody>
                    {nutritionRows.map(([label, value]) => (
                      <tr key={label} className="border-t border-forest/10">
                        <th scope="row" className={label.startsWith("of which") ? "py-2 pl-4 text-left font-normal text-charcoal/75" : "py-2 text-left font-semibold text-forest"}>
                          {label}
                        </th>
                        <td className="py-2 text-right tabular-nums text-charcoal/85">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-charcoal/75">Nutritional information has not been supplied for this product yet.</p>
              )}
            </Panel>
            <Panel title={chilled ? "Chilled storage" : "Frozen storage"} icon={chilled ? "drop" : "snowflake"}>
              <p className="text-sm leading-relaxed text-charcoal/85">{product.storage}</p>
            </Panel>
            <Panel title={chilled ? "Heating instructions" : "Preparation & cooking instructions"} icon="flame">
              <ol className="space-y-2 text-sm leading-relaxed text-charcoal/85">
                {product.preparation.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-forest text-xs font-bold text-gold">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
          <SampleNote className="mt-6">Sample product and food information for this preview. Ingredients, allergens, nutrition and instructions must be replaced with verified Curry Crafted data before launch.</SampleNote>
        </div>
      </section>

      {companions.length > 0 && (
        <section className="container-x py-12 md:py-16" aria-labelledby="fbt-heading">
          <SectionHeading eyebrow="Complete the meal" title={<span id="fbt-heading">Frequently Bought Together</span>} />
          <div className="mt-8">
            <BoughtTogether product={product} companions={companions} />
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="bg-cream-dark/60 py-16 md:py-20" aria-labelledby="related-heading">
          <div className="container-x">
            <SectionHeading eyebrow={`More from the ${product.range} range`} title={<span id="related-heading">You Might Also Like</span>} />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
