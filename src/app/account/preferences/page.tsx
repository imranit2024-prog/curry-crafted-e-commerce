import type { Metadata } from "next";
import { PreferencesForm } from "@/components/account-ui";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Marketing preferences" };

export default async function PreferencesPage() {
  const user = await requireUser();
  return (
    <div>
      <h1 className="display text-4xl text-forest">Marketing Preferences</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal/75">Choose how you&apos;d like to hear from us. You&apos;re in control and can change these whenever you like.</p>
      <div className="mt-8 max-w-2xl"><PreferencesForm user={user} /></div>
    </div>
  );
}
