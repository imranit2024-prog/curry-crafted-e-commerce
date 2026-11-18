import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/account-ui";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  return (
    <>
      <section className="on-dark relative overflow-hidden bg-forest text-cream">
        <div className="grain absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container-x relative py-10 md:py-14">
          <p className="eyebrow text-gold">My account</p>
          <p className="display mt-3 text-[clamp(2rem,5vw,3.5rem)]">
            Welcome back, <em className="text-gold">{user.name.split(" ")[0]}.</em>
          </p>
        </div>
      </section>
      <div className="container-x grid gap-8 py-8 md:py-12 lg:grid-cols-[17rem_1fr] lg:gap-12">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
