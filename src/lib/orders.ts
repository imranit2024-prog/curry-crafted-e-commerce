import { ApiError, apiRequest, getJson } from "./api";
import type { AddressDTO } from "./types";

export type OrderRow = {
  id: number;
  reference: string;
  userId: number | null;
  name: string;
  email: string;
  phone: string;
  address: { line1: string; line2: string; city: string; postcode: string };
  status: string;
  paymentStatus: string;
  paymentMode: string;
  subtotalPence: number;
  promoCode: string | null;
  discountPence: number;
  rewardPointsRedeemed: number;
  rewardDiscountPence: number;
  chilledDeliveryPence: number;
  frozenDeliveryPence: number;
  totalPence: number;
  pointsEarned: number;
  chilledDate: string | null;
  chilledSlotId: string | null;
  chilledSlotLabel: string | null;
  frozenDispatchDate: string | null;
  frozenEstimate: string | null;
  createdAt: Date;
  paidAt: Date | null;
};

export type OrderItemRow = {
  id: number;
  orderId: number;
  kind: string;
  refId: number;
  variantId: string | null;
  name: string;
  image: string;
  range: string;
  variantLabel: string | null;
  quantity: number;
  unitPricePence: number;
  lineTotalPence: number;
  contents: { productId: number; name: string; qty: number }[] | null;
};

type Wire<T, K extends keyof T> = Omit<T, K> & Record<K, string | null>;
type OrderWire = Wire<OrderRow, "createdAt" | "paidAt">;
type OrderBundle = { order: OrderRow; items: OrderItemRow[] };

const date = (value: string | null): Date | null => (value ? new Date(value) : null);
const reviveOrder = (o: OrderWire): OrderRow => ({ ...o, createdAt: new Date(o.createdAt ?? 0), paidAt: date(o.paidAt) });

/**
 * Order details for the current visitor. The API decides access: the account
 * that placed the order, or the browser that created a guest order.
 * `sync` asks the API to confirm a Stripe payment before answering.
 */
export async function getOrderForViewer(
  reference: string,
  opts: { sync?: boolean } = {},
): Promise<({ status: "ok" } & OrderBundle) | { status: "forbidden"; reference: string } | { status: "missing" }> {
  const res = await apiRequest<{ order: OrderWire; items: OrderItemRow[]; reference?: string }>(
    `/api/orders/${encodeURIComponent(reference)}${opts.sync ? "?sync=1" : ""}`,
  );
  if (res.status === 404) return { status: "missing" };
  if (res.status === 403) return { status: "forbidden", reference: res.data.reference ?? reference.toUpperCase() };
  if (!res.ok) throw new ApiError(res.status, res.data as unknown as Record<string, unknown>);
  return { status: "ok", order: reviveOrder(res.data.order), items: res.data.items };
}

/** Paid orders for the signed-in customer, newest first. */
export async function getOrdersForUser(): Promise<OrderBundle[]> {
  const data = await getJson<{ orders: { order: OrderWire; items: OrderItemRow[] }[] }>("/api/account/orders");
  return data.orders.map((o) => ({ order: reviveOrder(o.order), items: o.items }));
}

type HistoryWire = { id: number; kind: string; points: number; description: string; createdAt: string; expiresAt: string | null };
type ReferralWire = { referral: { id: number; status: string; rewardPoints: number; createdAt: string }; friendName: string };

export async function getRewardSummary() {
  const data = await getJson<{ history: HistoryWire[]; balance: number; earned: number; redeemed: number; nextExpiry: string | null; referrals: ReferralWire[] }>(
    "/api/account/rewards",
  );
  return {
    balance: data.balance,
    earned: data.earned,
    redeemed: data.redeemed,
    nextExpiry: date(data.nextExpiry),
    history: data.history.map((h) => ({ ...h, createdAt: new Date(h.createdAt), expiresAt: date(h.expiresAt) })),
    referrals: data.referrals.map((r) => ({ friendName: r.friendName, referral: { ...r.referral, createdAt: new Date(r.referral.createdAt) } })),
  };
}

export async function getAddresses(): Promise<AddressDTO[]> {
  return (await getJson<{ addresses: AddressDTO[] }>("/api/account/addresses")).addresses;
}

export type FrozenRestriction = { id: number; prefix: string; kind: string; surchargePence: number; note: string };

export async function getFrozenRestrictions(): Promise<FrozenRestriction[]> {
  return (await getJson<{ restrictions: FrozenRestriction[] }>("/api/delivery/restrictions", { session: false })).restrictions;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  preparing: "Being prepared",
  dispatched: "On its way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
