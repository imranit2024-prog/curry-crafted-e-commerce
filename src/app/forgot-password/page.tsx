import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <AuthShell
      eyebrow="Account help"
      title={<>Forgot your <em className="text-forest-600">password?</em></>}
      intro="Enter the email you registered with and we'll send a link to choose a new password."
      footer={<p>Remembered it? <Link href="/login" className="font-semibold text-forest underline underline-offset-4">Back to sign in</Link></p>}
    >
      <ForgotForm />
    </AuthShell>
  );
}
