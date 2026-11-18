import type { Metadata } from "next";
import { DetailsForm, PasswordForm } from "@/components/account-ui";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account details" };

export default async function DetailsPage() {
  const user = await requireUser();
  return (
    <div className="space-y-6">
      <h1 className="display text-4xl text-forest">Account Details</h1>
      <DetailsForm user={user} />
      <PasswordForm />
    </div>
  );
}
