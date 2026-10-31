import * as React from "react";
import { LegalPageHeader } from "@/components/public/legal-page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Privacy policy",
  alternates: { canonical: "/privacy" },
};

// Privacy contact — uses the configured support email if available, otherwise
// directs users to the contact page. We do not hardcode an unverified email
// in a legal document.
const PRIVACY_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? null;
const privacyContact = PRIVACY_EMAIL
  ? `email ${PRIVACY_EMAIL}`
  : "use our contact page at /contact";

const sections = [
  {
    title: "1. Who we are",
    body: "NetLodge Technologies Ltd. (\"NetLodge\", \"we\", \"us\") is a Nigerian PropTech company registered in Lagos. We operate the NetLodge marketplace at netlodge.com. This Privacy Policy explains how we collect, use, share and protect your personal data.",
  },
  {
    title: "2. Data we collect",
    body: "We collect: (a) account data — name, email, phone number, role; (b) identity verification data — government-issued ID, utility bills, ownership documents (landlords only); (c) booking and payment data — booking references, Paystack transaction references (we never store full card details); (d) usage data — pages visited, searches, devices; (e) communications — messages between students and landlords, support tickets.",
  },
  {
    title: "3. How we use your data",
    body: "We use your data to: verify identity and ownership; facilitate bookings and payments; process payouts and refunds; communicate with you about your account; investigate disputes and safety reports; improve the Platform; comply with legal obligations. We never sell your personal data.",
  },
  {
    title: "4. Legal basis",
    body: "We process your personal data on the basis of: contract (to deliver the booking and listing services you've requested); legal obligation (to comply with Nigerian financial regulations and tax law); legitimate interest (to prevent fraud, abuse and safety incidents); consent (for non-essential marketing communications, which you can withdraw at any time).",
  },
  {
    title: "5. Sharing with third parties",
    body: "We share data with: Paystack (payment processing); Cloudinary (property image hosting); Supabase (database and authentication infrastructure); cloud hosting providers; law enforcement where legally compelled. Landlords and students can see each other's basic contact details only after a booking is confirmed.",
  },
  {
    title: "6. International transfers",
    body: "Some of our processors operate outside Nigeria. We only transfer data to countries with adequate data protection or under appropriate safeguards such as Standard Contractual Clauses. Nigerian student and landlord data is stored primarily in our Supabase instance.",
  },
  {
    title: "7. Data retention",
    body: "We retain account data for the lifetime of your account plus 6 years for tax and audit purposes. Verification documents are retained for the lifetime of the landlord account plus 3 years. Booking and payment data is retained for 7 years per Nigerian financial regulations.",
  },
  {
    title: "8. Your rights",
    body: `Under the Nigeria Data Protection Act 2023, you have the right to: access your data; correct inaccurate data; delete your account (subject to ongoing legal obligations); object to processing; data portability; withdraw consent. To exercise these rights, ${privacyContact}.`,
  },
  {
    title: "9. Security",
    body: "We use TLS encryption in transit, AES-256 encryption at rest, and row-level security in our Supabase instance. Access to verification documents is restricted to authorised NetLodge staff. We never expose identity documents, exact room addresses, or payment credentials in public metadata.",
  },
  {
    title: "10. Children",
    body: "NetLodge is not intended for children under 18. Students under 18 must use the Platform through a parent or legal guardian. We do not knowingly collect data from children under 18 without parental consent.",
  },
  {
    title: "11. Changes to this Policy",
    body: "We may update this Policy from time to time. Material changes will be notified by email at least 30 days before taking effect.",
  },
  {
    title: "12. Contact",
    body: `For privacy questions or requests, ${privacyContact} or write to: Data Protection Officer, NetLodge Technologies Ltd., Yaba, Lagos, Nigeria.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <LegalPageHeader
        eyebrowKey="legal.eyebrow"
        titleKey="legal.privacy.title"
        descriptionKey="legal.privacy.description"
      />
      <Card className="mt-8">
        <CardContent className="space-y-6 p-6 sm:p-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-lg font-semibold tracking-tight">{s.title}</h2>
              <p className="mt-2 text-sm text-foreground/90 text-pretty leading-relaxed">{s.body}</p>
            </section>
          ))}
        </CardContent>
      </Card>
      <p className="mt-6 text-xs text-muted-foreground">
        This document is illustrative and is not legal advice. Consult a qualified Nigerian lawyer before relying on this Policy.
      </p>
    </div>
  );
}
