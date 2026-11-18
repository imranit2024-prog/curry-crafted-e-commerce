import { cache } from "react";
import { getJson } from "./api";
import type { BundleDTO, ProductDTO } from "./types";

/** All listed products. `available` is false when a listed product can't currently be bought. */
export const getProducts = cache(async (): Promise<ProductDTO[]> => {
  return (await getJson<{ products: ProductDTO[] }>("/api/catalog/products", { session: false })).products;
});

export async function getProductBySlug(slug: string): Promise<ProductDTO | null> {
  return (await getProducts()).find((p) => p.slug === slug) ?? null;
}

export const getBundles = cache(async (): Promise<BundleDTO[]> => {
  return (await getJson<{ bundles: BundleDTO[] }>("/api/catalog/bundles", { session: false })).bundles;
});
