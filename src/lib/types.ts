/* Shared, client-safe types and helpers. No server imports in this file. */

export type Range = "chilled" | "frozen";

export const CATEGORIES = [
  { id: "chicken", label: "Chicken" },
  { id: "lamb", label: "Lamb" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "sides", label: "Sides" },
  { id: "accompaniments", label: "Accompaniments" },
] as const;

export const MAIN_CATEGORIES = ["chicken", "lamb", "vegetarian"];
export const SIDE_CATEGORIES = ["sides", "accompaniments"];

export const ALLERGENS: Record<string, string> = {
  celery: "Celery",
  gluten: "Cereals containing gluten",
  crustaceans: "Crustaceans",
  eggs: "Eggs",
  fish: "Fish",
  lupin: "Lupin",
  milk: "Milk",
  molluscs: "Molluscs",
  mustard: "Mustard",
  nuts: "Tree nuts",
  peanuts: "Peanuts",
  sesame: "Sesame",
  soya: "Soya",
  sulphites: "Sulphites",
};

export const DIETARY: Record<string, { label: string; short: string }> = {
  vegetarian: { label: "Vegetarian", short: "V" },
  vegan: { label: "Vegan", short: "VE" },
  "gluten-free": { label: "No gluten-containing ingredients", short: "NGCI" },
};

export const SPICE_LABELS = ["Mild", "Gentle heat", "Medium", "Hot"];

export type Variant = { id: string; label: string; pricePence: number };

export type Nutrition = {
  energyKcal: number;
  fat: number;
  saturates: number;
  carbs: number;
  sugars: number;
  protein: number;
  salt: number;
};

export type ProductDTO = {
  id: number;
  slug: string;
  name: string;
  range: Range;
  category: string;
  shortDescription: string;
  description: string;
  image: string;
  gallery: string[];
  pricePence: number;
  variants: Variant[];
  dietary: string[];
  spiceLevel: number;
  ingredients: string;
  allergens: string[];
  mayContain: string[];
  nutrition: Nutrition | null;
  storage: string;
  preparation: string[];
  servings: string;
  available: boolean;
  maxPerOrder: number;
  popularity: number;
  featured: boolean;
  createdAt: string;
};

export type BundleDTO = {
  id: number;
  slug: string;
  name: string;
  description: string;
  image: string;
  range: Range;
  serves: string;
  mainsCount: number;
  sidesCount: number;
  pricePence: number;
  /** Largest possible saving versus buying the same items individually at current prices. */
  saveUpToPence: number;
};

export type BundleSelection = { productId: number; qty: number };

export type CartLine =
  | { key: string; type: "product"; productId: number; variantId: string; qty: number }
  | { key: string; type: "bundle"; bundleId: number; selections: BundleSelection[]; qty: number };

export type PostcodeResult = {
  postcode: string;
  outward: string;
  chilled: boolean;
  frozen: boolean;
  frozenSurchargePence: number;
  frozenNote: string | null;
};

export type QuoteLine = {
  key: string;
  type: "product" | "bundle";
  refId: number;
  slug: string | null;
  name: string;
  image: string;
  range: Range;
  variantId: string | null;
  variantLabel: string | null;
  qty: number;
  maxQty: number;
  unitPricePence: number;
  lineTotalPence: number;
  /** Product/bundle exists, is active, in stock and correctly configured. */
  purchasable: boolean;
  /** Delivery eligibility for this line's range has been confirmed. */
  eligible: boolean;
  issue: string | null;
  contents: { productId: number; name: string; qty: number }[] | null;
};

export type GroupSummary = {
  range: Range;
  itemCount: number;
  subtotalPence: number;
  deliveryPence: number;
  surchargePence: number;
  minOrderPence: number;
  remainingToMinPence: number;
  freeOverPence: number | null;
  remainingToFreePence: number | null;
  status: "ok" | "unchecked" | "ineligible";
  message: string;
};

export type Quote = {
  lines: QuoteLine[];
  chilled: GroupSummary | null;
  frozen: GroupSummary | null;
  postcode: PostcodeResult | null;
  promo: { code: string; valid: boolean; message: string; discountPence: number } | null;
  rewards: {
    signedIn: boolean;
    balance: number;
    maxRedeemable: number;
    applied: number;
    discountPence: number;
    pointValuePence: number;
    minRedeemPoints: number;
  };
  subtotalPence: number;
  discountPence: number;
  rewardDiscountPence: number;
  deliveryPence: number;
  totalPence: number;
  pointsToEarn: number;
  blockers: string[];
  canCheckout: boolean;
};

export type UserDTO = {
  id: number;
  name: string;
  email: string;
  phone: string;
  referralCode: string;
  marketingEmail: boolean;
  marketingSms: boolean;
};

export type AddressDTO = {
  id: number;
  label: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  isDefault: boolean;
};

export type SlotDTO = { id: string; label: string; remaining: number; available: boolean };
export type ScheduleDateDTO = {
  date: string; // YYYY-MM-DD
  weekday: string;
  dayLabel: string;
  longLabel: string;
  cutoffLabel: string;
  open: boolean;
  slots: SlotDTO[];
};
export type FrozenEstimateDTO = {
  dispatchDate: string;
  dispatchLabel: string;
  estimateLabel: string;
  cutoffLabel: string;
};
export type ScheduleDTO = { chilled: ScheduleDateDTO[]; frozen: FrozenEstimateDTO };

export type StoreConfig = {
  delivery: {
    chilled: { minOrderPence: number; chargePence: number; freeOverPence: number | null };
    frozen: { minOrderPence: number; chargePence: number; freeOverPence: number | null };
  };
  chilledSchedule: {
    deliveryWeekdays: number[]; // 0 = Sunday
    slots: { id: string; label: string }[];
    capacityPerSlot: number;
    cutoffHour: number;
    cutoffDaysBefore: number;
    horizonDays: number;
  };
  frozenSchedule: { dispatchWeekdays: number[]; cutoffHour: number; transitDaysMin: number; transitDaysMax: number };
  rewards: {
    pointsPerPound: number;
    pointValuePence: number;
    minRedeemPoints: number;
    expiryMonths: number;
    doublePoints: { active: boolean; label: string };
  };
  referral: { referrerPoints: number; friendPoints: number; minQualifyingOrderPence: number };
  guestCheckout: boolean;
  contact: { email: string; phone: string; address: string; hours: string };
};

export function formatPrice(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  return `${sign}£${(Math.abs(pence) / 100).toFixed(2)}`;
}

export function formatPriceShort(pence: number): string {
  return pence % 100 === 0 ? `£${pence / 100}` : formatPrice(pence);
}

export function rangeLabel(range: Range): string {
  return range === "chilled" ? "Chilled" : "Frozen";
}

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function listWeekdays(days: number[]): string {
  const names = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAYS[d]);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function hourLabel(hour: number): string {
  if (hour === 12) return "12 noon";
  if (hour === 0) return "midnight";
  return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
}
