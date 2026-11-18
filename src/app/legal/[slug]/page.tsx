import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, SampleNote } from "@/components/ui";

export const dynamic = "force-dynamic";

type Doc = { title: string; intro: string; sections: { heading: string; body: string[] }[] };

const DOCS: Record<string, Doc> = {
  privacy: {
    title: "Privacy Policy",
    intro: "How Curry Crafted collects, uses and protects your personal information.",
    sections: [
      { heading: "Information we collect", body: ["When you order or create an account we collect your name, email address, telephone number, delivery address and order history.", "Card payments are handled by our payment provider. We do not receive or store your full card number."] },
      { heading: "How we use your information", body: ["To take and fulfil your orders, arrange delivery, provide customer service, run your rewards and referral account, and meet our legal obligations.", "We only send marketing messages if you have opted in, and you can change your choice at any time in your account or by using the unsubscribe link."] },
      { heading: "Sharing your information", body: ["We share only what is necessary with the service providers that help us operate, such as payment processing and delivery couriers."] },
      { heading: "Your rights", body: ["You can ask to see, correct or delete the personal information we hold about you, and you can object to or restrict certain uses. Contact us to make a request."] },
      { heading: "Retention and security", body: ["We keep your information only for as long as needed for the purposes above, and protect it with appropriate technical and organisational measures. Account passwords are stored in hashed form."] },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    intro: "The terms that apply when you order from Curry Crafted.",
    sections: [
      { heading: "Ordering", body: ["Orders are placed in advance through this website. Your order is confirmed once payment has been received and you see an order confirmation with a reference number.", "Each range has a minimum order value, shown in your basket before checkout."] },
      { heading: "Prices and payment", body: ["Prices are shown in pounds sterling. The price you pay is the price confirmed at checkout, together with any delivery charges shown before payment."] },
      { heading: "Delivery", body: ["Chilled products are delivered only to postcodes within our chilled delivery area. Frozen products are delivered within the UK subject to courier coverage. Delivery dates for frozen products are estimates.", "Chilled and frozen products are fulfilled separately and may arrive on different days."] },
      { heading: "Food information", body: ["Ingredient and allergen information is provided on each product page and on the product label. Please read it before ordering and again when your order arrives."] },
      { heading: "Rewards and referrals", body: ["Reward points and referral rewards are issued according to the programme rules shown in your account, have no cash value, and may be changed or withdrawn with notice."] },
    ],
  },
  returns: {
    title: "Returns / Cancellation Policy",
    intro: "What to do if you need to change or cancel an order, or if something isn't right.",
    sections: [
      { heading: "Cancelling or changing an order", body: ["Because our food is cooked to order, changes and cancellations can only be accepted before the order cut-off for your delivery. Contact us as soon as possible with your order reference."] },
      { heading: "Perishable goods", body: ["Chilled and frozen foods are perishable, so they can't be returned once delivered. This doesn't affect your legal rights if a product is faulty or not as described."] },
      { heading: "If something isn't right", body: ["If an item is missing, damaged or not of the quality you expect, tell us as soon as possible after delivery, ideally with a photograph, and we'll put it right with a replacement, credit or refund as appropriate."] },
      { heading: "Refunds", body: ["Approved refunds are returned to the original payment method. Reward points redeemed on a refunded order are returned to your account."] },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    intro: "The cookies and similar storage this website uses.",
    sections: [
      { heading: "Essential cookies", body: ["This website currently uses only cookies that are essential for it to work. They do not track you across other websites.", "cc_session keeps you signed in. cc_postcode remembers the postcode you checked so we can show the right delivery options. cc_orders lets you view the confirmation page for orders placed in this browser."] },
      { heading: "Local storage", body: ["Your basket is saved in your browser's local storage so it's still there when you come back. Details you type at checkout are kept in session storage until you close the tab."] },
      { heading: "Analytics and marketing cookies", body: ["None are set at present. If analytics or marketing tools are added in future, this policy will be updated and you'll be asked for consent before any non-essential cookies are used."] },
      { heading: "Managing cookies", body: ["You can clear or block cookies in your browser settings. If you block essential cookies, signing in and checkout won't work."] },
    ],
  },
};

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: DOCS[slug]?.title ?? "Not found" };
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();
  return (
    <>
      <PageHero crumbs={[{ label: "Home", href: "/" }, { label: doc.title }]} eyebrow="Policies" title={doc.title} intro={doc.intro} />
      <div className="container-x grid gap-10 py-12 md:py-16 lg:grid-cols-[15rem_1fr]">
        <nav aria-label="Policies" className="lg:sticky lg:top-24 lg:h-fit">
          <ul className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:block lg:space-y-1 lg:px-0">
            {Object.entries(DOCS).map(([key, d]) => (
              <li key={key} className="flex-none">
                <Link href={`/legal/${key}`} aria-current={key === slug ? "page" : undefined} className={`flex h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold ${key === slug ? "bg-forest text-cream" : "border border-forest/15 bg-white text-forest hover:bg-forest/5 lg:border-0 lg:bg-transparent"}`}>{d.title}</Link>
              </li>
            ))}
            <li className="flex-none"><Link href="/delivery" className="flex h-11 items-center whitespace-nowrap rounded-full border border-forest/15 bg-white px-4 text-sm font-semibold text-forest hover:bg-forest/5 lg:border-0 lg:bg-transparent">Delivery Policy</Link></li>
          </ul>
        </nav>
        <article className="max-w-3xl">
          <SampleNote>Draft template for design review. This policy is not legal advice and must be reviewed, completed with Curry Crafted&apos;s company details, and approved before launch.</SampleNote>
          <div className="mt-8 space-y-10">
            {doc.sections.map((s, i) => (
              <section key={s.heading}>
                <h2 className="display text-3xl text-forest">{i + 1}. {s.heading}</h2>
                {s.body.map((p, j) => <p key={j} className="mt-3 text-base leading-relaxed text-charcoal/85">{p}</p>)}
              </section>
            ))}
          </div>
          <p className="mt-12 border-t border-forest/15 pt-6 text-sm text-charcoal/75">Questions about this policy? <Link href="/contact" className="font-semibold text-forest underline underline-offset-4">Contact us</Link>.</p>
        </article>
      </div>
    </>
  );
}
