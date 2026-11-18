import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { AuthShell, safeNext } from "@/components/auth-shell";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; ref?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next);
  const ref = (sp.ref ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
  return (
    <AuthShell
      eyebrow="Join rewards"
      title={<>Create your <em className="text-forest-600">account.</em></>}
      intro={ref ? "You've been invited by a friend. Their referral code is already filled in below." : "It's free, takes a minute, and every order starts earning reward points."}
      footer={<p>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-forest underline underline-offset-4">Sign in</Link></p>}
    >
      <RegisterForm next={next} referralCode={ref} />
    </AuthShell>
  );
}
