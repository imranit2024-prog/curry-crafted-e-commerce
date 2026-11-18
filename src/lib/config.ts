import { cache } from "react";
import { getJson } from "./api";
import type { StoreConfig } from "./types";

const getStore = cache(() => getJson<{ config: StoreConfig; stripeEnabled: boolean }>("/api/config", { session: false }));

/** Business rules (delivery, slots, rewards, referrals) are stored in the database and served by the API. */
export async function getConfig(): Promise<StoreConfig> {
  return (await getStore()).config;
}

export async function stripeConfigured(): Promise<boolean> {
  return (await getStore()).stripeEnabled;
}
