import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  range: text("range").notNull(), // "chilled" | "frozen"
  category: text("category").notNull(),
  shortDescription: text("short_description").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  gallery: jsonb("gallery").$type<string[]>().notNull().default([]),
  variants: jsonb("variants").$type<{ id: string; label: string; pricePence: number }[]>().notNull(),
  dietary: jsonb("dietary").$type<string[]>().notNull().default([]),
  spiceLevel: integer("spice_level").notNull().default(0),
  ingredients: text("ingredients").notNull(),
  allergens: jsonb("allergens").$type<string[]>().notNull().default([]),
  mayContain: jsonb("may_contain").$type<string[]>().notNull().default([]),
  nutrition: jsonb("nutrition").$type<Record<string, number> | null>(),
  storage: text("storage").notNull(),
  preparation: jsonb("preparation").$type<string[]>().notNull().default([]),
  servings: text("servings").notNull().default(""),
  active: boolean("active").notNull().default(true),
  inStock: boolean("in_stock").notNull().default(true),
  maxPerOrder: integer("max_per_order").notNull().default(12),
  popularity: integer("popularity").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bundles = pgTable("bundles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  range: text("range").notNull(),
  serves: text("serves").notNull(),
  mainsCount: integer("mains_count").notNull(),
  sidesCount: integer("sides_count").notNull(),
  pricePence: integer("price_pence").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

/* ------------------------------------------------------------------ */
/* Configurable business rules                                         */
/* ------------------------------------------------------------------ */

/** Postcode areas / outward codes that qualify for chilled delivery. */
export const chilledPostcodes = pgTable("chilled_postcodes", {
  id: serial("id").primaryKey(),
  prefix: text("prefix").notNull().unique(),
  active: boolean("active").notNull().default(true),
});

/** Frozen delivery is UK-wide except for the restrictions configured here. */
export const frozenRestrictions = pgTable("frozen_restrictions", {
  id: serial("id").primaryKey(),
  prefix: text("prefix").notNull().unique(),
  kind: text("kind").notNull(), // "excluded" | "surcharge"
  surchargePence: integer("surcharge_pence").notNull().default(0),
  note: text("note").notNull().default(""),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
});

export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  kind: text("kind").notNull(), // "percent" | "fixed"
  value: integer("value").notNull(),
  minSpendPence: integer("min_spend_pence").notNull().default(0),
  description: text("description").notNull().default(""),
  active: boolean("active").notNull().default(true),
});

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  referralCode: text("referral_code").notNull().unique(),
  referredByUserId: integer("referred_by_user_id"),
  marketingEmail: boolean("marketing_email").notNull().default(false),
  marketingSms: boolean("marketing_sms").notNull().default(false),
  marketingUpdatedAt: timestamp("marketing_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 of the cookie token
    userId: integer("user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const addresses = pgTable(
  "addresses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    label: text("label").notNull().default("Home"),
    line1: text("line1").notNull(),
    line2: text("line2").notNull().default(""),
    city: text("city").notNull(),
    postcode: text("postcode").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    userId: integer("user_id"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    address: jsonb("address").$type<{ line1: string; line2: string; city: string; postcode: string }>().notNull(),
    status: text("status").notNull().default("pending_payment"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    paymentMode: text("payment_mode").notNull().default("demo"), // "stripe" | "demo"
    stripeSessionId: text("stripe_session_id"),
    stripeUrl: text("stripe_url"),
    subtotalPence: integer("subtotal_pence").notNull(),
    promoCode: text("promo_code"),
    discountPence: integer("discount_pence").notNull().default(0),
    rewardPointsRedeemed: integer("reward_points_redeemed").notNull().default(0),
    rewardDiscountPence: integer("reward_discount_pence").notNull().default(0),
    chilledDeliveryPence: integer("chilled_delivery_pence").notNull().default(0),
    frozenDeliveryPence: integer("frozen_delivery_pence").notNull().default(0),
    totalPence: integer("total_pence").notNull(),
    pointsEarned: integer("points_earned").notNull().default(0),
    chilledDate: text("chilled_date"),
    chilledSlotId: text("chilled_slot_id"),
    chilledSlotLabel: text("chilled_slot_label"),
    frozenDispatchDate: text("frozen_dispatch_date"),
    frozenEstimate: text("frozen_estimate"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [index("orders_user_idx").on(t.userId), index("orders_slot_idx").on(t.chilledDate, t.chilledSlotId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull(),
    kind: text("kind").notNull(), // "product" | "bundle"
    refId: integer("ref_id").notNull(),
    variantId: text("variant_id"),
    name: text("name").notNull(),
    image: text("image").notNull(),
    range: text("range").notNull(),
    variantLabel: text("variant_label"),
    quantity: integer("quantity").notNull(),
    unitPricePence: integer("unit_price_pence").notNull(),
    lineTotalPence: integer("line_total_pence").notNull(),
    contents: jsonb("contents").$type<{ productId: number; name: string; qty: number }[] | null>(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/* ------------------------------------------------------------------ */
/* Loyalty & referral                                                  */
/* ------------------------------------------------------------------ */

export const rewardTransactions = pgTable(
  "reward_transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    orderId: integer("order_id"),
    kind: text("kind").notNull(), // "earn" | "redeem" | "referral" | "bonus"
    points: integer("points").notNull(), // signed
    description: text("description").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reward_tx_user_idx").on(t.userId)],
);

export const referrals = pgTable(
  "referrals",
  {
    id: serial("id").primaryKey(),
    referrerUserId: integer("referrer_user_id").notNull(),
    referredUserId: integer("referred_user_id").notNull().unique(),
    status: text("status").notNull().default("registered"), // "registered" | "qualified"
    rewardPoints: integer("reward_points").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    qualifiedAt: timestamp("qualified_at", { withTimezone: true }),
  },
  (t) => [index("referrals_referrer_idx").on(t.referrerUserId)],
);

/* ------------------------------------------------------------------ */
/* Enquiries & marketing                                               */
/* ------------------------------------------------------------------ */

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  topic: text("topic").notNull().default("General"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  consent: boolean("consent").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
