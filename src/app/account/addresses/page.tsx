import type { Metadata } from "next";
import { AddressManager } from "@/components/account-ui";
import { requireUser } from "@/lib/auth";
import { getAddresses } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My addresses" };

export default async function AddressesPage() {
  await requireUser();
  const addresses = await getAddresses();
  return (
    <div>
      <h1 className="display text-4xl text-forest">My Addresses</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal/75">Saved addresses can be selected at checkout. Delivery eligibility is always checked against the postcode you choose for each order.</p>
      <div className="mt-8">
        <AddressManager initial={addresses} />
      </div>
    </div>
  );
}
