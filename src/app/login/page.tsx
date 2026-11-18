import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { AuthShell, safeNext } from "@/components/auth-shell";
import { getCurrentUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  const { guestCheckout } = await getConfig();
  return (
    <AuthShell
      eyebrow="Welcome back"
      title={<>Sign in to <em className="text-forest-600">Curry Crafted.</em></>}
      intro="Access your orders, saved addresses, rewards and referral link."
      footer={
        <div className="space-y-2">
          <p>New here? <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-forest underline underline-offset-4">Create an account</Link></p>
          {guestCheckout && <p>Just want to order? <Link href="/basket" className="font-semibold text-forest underline underline-offset-4">Continue as a guest</Link>. No account needed.</p>}
        </div>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
