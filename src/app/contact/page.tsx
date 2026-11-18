import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { Icon, PageHero, SampleNote } from "@/components/ui";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact us" };

export default async function ContactPage() {
  const { contact } = await getConfig();
  const rows = [
    { icon: "mail", label: "Email", value: contact.email },
    { icon: "phone", label: "Telephone", value: contact.phone },
    { icon: "pin", label: "Kitchen & registered address", value: contact.address },
    { icon: "clock", label: "Customer care hours", value: contact.hours },
  ];
  return (
    <>
      <PageHero crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]} eyebrow="Contact us" title={<>We&apos;re Here <em className="text-gold">to Help.</em></>} intro="Questions about an order, delivery, allergens or rewards? Send us a message and the team will get back to you." />
      <section className="container-x grid gap-10 py-12 md:py-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] md:p-9">
            <h2 className="display text-3xl text-forest">Send a message</h2>
            <p className="mb-7 mt-2 text-sm text-charcoal/75">For allergy questions, please contact us before placing your order.</p>
            <ContactForm />
          </div>
        </div>
        <aside className="space-y-5 lg:col-span-5">
          <div className="on-dark rounded-3xl bg-forest p-7 text-cream">
            <h2 className="display text-3xl">Contact details</h2>
            <dl className="mt-6 space-y-5">
              {rows.map((r) => (
                <div key={r.label} className="flex gap-4">
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-cream/10 text-gold"><Icon name={r.icon} /></span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-cream/65">{r.label}</dt>
                    <dd className="mt-0.5 break-words font-medium">{r.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
          <SampleNote>Contact details and business information are placeholders. Curry Crafted&apos;s registered company name, number, address, phone and opening hours need to be supplied.</SampleNote>
          <div className="rounded-3xl bg-sage p-7">
            <h2 className="display text-2xl text-forest">Quick answers</h2>
            <ul className="mt-4 space-y-2.5 text-sm font-semibold text-forest">
              {[["/faqs", "Frequently asked questions"], ["/delivery", "Delivery information & policy"], ["/food-information", "Allergen & food information"], ["/legal/returns", "Returns & cancellation policy"]].map(([href, label]) => (
                <li key={href}><Link href={href} className="flex items-center justify-between gap-3 underline-offset-4 hover:underline">{label} <Icon name="arrow-right" className="h-4 w-4" /></Link></li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </>
  );
}
