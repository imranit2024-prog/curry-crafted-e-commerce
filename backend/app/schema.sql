CREATE TABLE "addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"label" text DEFAULT 'Home' NOT NULL,
	"line1" text NOT NULL,
	"line2" text DEFAULT '' NOT NULL,
	"city" text NOT NULL,
	"postcode" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "bundles" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image" text NOT NULL,
	"range" text NOT NULL,
	"serves" text NOT NULL,
	"mains_count" integer NOT NULL,
	"sides_count" integer NOT NULL,
	"price_pence" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "bundles_slug_unique" UNIQUE("slug")
);
CREATE TABLE "chilled_postcodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"prefix" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "chilled_postcodes_prefix_unique" UNIQUE("prefix")
);
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"topic" text DEFAULT 'General' NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "frozen_restrictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"prefix" text NOT NULL,
	"kind" text NOT NULL,
	"surcharge_pence" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "frozen_restrictions_prefix_unique" UNIQUE("prefix")
);
CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"consent" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"kind" text NOT NULL,
	"ref_id" integer NOT NULL,
	"variant_id" text,
	"name" text NOT NULL,
	"image" text NOT NULL,
	"range" text NOT NULL,
	"variant_label" text,
	"quantity" integer NOT NULL,
	"unit_price_pence" integer NOT NULL,
	"line_total_pence" integer NOT NULL,
	"contents" jsonb
);
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"user_id" integer,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" jsonb NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"payment_mode" text DEFAULT 'demo' NOT NULL,
	"stripe_session_id" text,
	"stripe_url" text,
	"subtotal_pence" integer NOT NULL,
	"promo_code" text,
	"discount_pence" integer DEFAULT 0 NOT NULL,
	"reward_points_redeemed" integer DEFAULT 0 NOT NULL,
	"reward_discount_pence" integer DEFAULT 0 NOT NULL,
	"chilled_delivery_pence" integer DEFAULT 0 NOT NULL,
	"frozen_delivery_pence" integer DEFAULT 0 NOT NULL,
	"total_pence" integer NOT NULL,
	"points_earned" integer DEFAULT 0 NOT NULL,
	"chilled_date" text,
	"chilled_slot_id" text,
	"chilled_slot_label" text,
	"frozen_dispatch_date" text,
	"frozen_estimate" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "orders_reference_unique" UNIQUE("reference"),
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key")
);
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"range" text NOT NULL,
	"category" text NOT NULL,
	"short_description" text NOT NULL,
	"description" text NOT NULL,
	"image" text NOT NULL,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"variants" jsonb NOT NULL,
	"dietary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"spice_level" integer DEFAULT 0 NOT NULL,
	"ingredients" text NOT NULL,
	"allergens" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"may_contain" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nutrition" jsonb,
	"storage" text NOT NULL,
	"preparation" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"servings" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"in_stock" boolean DEFAULT true NOT NULL,
	"max_per_order" integer DEFAULT 12 NOT NULL,
	"popularity" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
CREATE TABLE "promo_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"kind" text NOT NULL,
	"value" integer NOT NULL,
	"min_spend_pence" integer DEFAULT 0 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_user_id" integer NOT NULL,
	"referred_user_id" integer NOT NULL,
	"status" text DEFAULT 'registered' NOT NULL,
	"reward_points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"qualified_at" timestamp with time zone,
	CONSTRAINT "referrals_referred_user_id_unique" UNIQUE("referred_user_id")
);
CREATE TABLE "reward_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"order_id" integer,
	"kind" text NOT NULL,
	"points" integer NOT NULL,
	"description" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"referral_code" text NOT NULL,
	"referred_by_user_id" integer,
	"marketing_email" boolean DEFAULT false NOT NULL,
	"marketing_sms" boolean DEFAULT false NOT NULL,
	"marketing_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id");
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");
CREATE INDEX "orders_slot_idx" ON "orders" USING btree ("chilled_date","chilled_slot_id");
CREATE INDEX "referrals_referrer_idx" ON "referrals" USING btree ("referrer_user_id");
CREATE INDEX "reward_tx_user_idx" ON "reward_transactions" USING btree ("user_id");
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");
