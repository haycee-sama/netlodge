import * as React from "react";
import { LegalPageHeader } from "@/components/public/legal-page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Terms of service",
  alternates: { canonical: "/terms" },
};

const sections = [
  {
    title: "1. Acceptance of terms",
    body: "By accessing or using NetLodge (the \"Platform\"), you agree to be bound by these Terms of Service (\"Terms\"). If you do not agree, you may not access or use the Platform. These Terms form a legally binding agreement between you and NetLodge Technologies Ltd. (\"NetLodge\", \"we\", \"us\").",
  },
  {
    title: "2. Nature of the Platform",
    body: "NetLodge is a marketplace that connects students seeking accommodation with landlords and property managers offering accommodation. NetLodge is not a party to any lease agreement between a student and a landlord. We facilitate discovery, booking, payment processing and dispute resolution, but the landlord-tenant relationship is governed by the lease agreement executed between the parties.",
  },
  {
    title: "3. Eligibility",
    body: "You must be at least 18 years old and legally capable of entering into binding contracts to use NetLodge. Students under 18 must use the Platform through a parent or legal guardian. Landlords must have legal authority to lease the properties they list — either as owners or as authorised property managers with documented authority.",
  },
  {
    title: "4. Verification",
    body: "Landlords must complete identity, address and ownership verification before listing properties. NetLodge reserves the right to refuse or revoke verification at any time. Verification does not constitute an endorsement of any landlord or property; it confirms that the listed identity, address and ownership documents have been reviewed and an on-site inspection has been conducted.",
  },
  {
    title: "5. Bookings and payment",
    body: "Bookings are made through the Platform via Paystack-processed payments. The Platform uses a server-controlled hold system: a temporary hold reserves a specific rentable unit for a defined period pending payment. Bookings are confirmed only after the backend confirms payment from Paystack. Off-platform payments are not protected by NetLodge and may result in forfeiture of booking protections.",
  },
  {
    title: "6. Refunds and cancellations",
    body: "Students may cancel a booking within 24 hours of placement for a full refund. After that window, refund eligibility depends on the cancellation terms in the lease agreement. Caution deposits are refunded at the end of the tenancy, less any documented damages. Refunds are processed to the original payment method and typically arrive within 5–7 business days.",
  },
  {
    title: "7. Landlord obligations",
    body: "Landlords must accurately describe their properties and rentable units, including photographs that depict the actual unit (or clearly label representative imagery). Landlords must maintain properties in habitable condition, honour confirmed bookings, and respond to student communications within 48 hours. NetLodge may suspend or remove listings that violate these obligations.",
  },
  {
    title: "8. Prohibited conduct",
    body: "You may not use NetLodge to list illegal properties, misrepresent units, solicit off-platform payments, harass other users, discriminate on the basis of tribe, religion, gender or other protected characteristics, or attempt to circumvent verification. Violations may result in immediate account suspension and forfeiture of pending payouts.",
  },
  {
    title: "9. Fees",
    body: "NetLodge charges a service fee on each booking, displayed transparently at checkout. Landlords are charged a platform fee on payouts, deducted before settlement. We do not charge hidden fees. All fees are disclosed before a booking is confirmed.",
  },
  {
    title: "10. Liability",
    body: "NetLodge facilitates transactions but is not liable for the conduct of landlords or students, the condition of properties, or breaches of lease agreements. Our liability is limited to the service fees collected on the relevant transaction. We are not liable for indirect, incidental or consequential damages.",
  },
  {
    title: "11. Changes to these Terms",
    body: "We may update these Terms from time to time. Material changes will be notified by email and via in-platform notification at least 30 days before taking effect. Continued use of the Platform after the effective date constitutes acceptance of the updated Terms.",
  },
  {
    title: "12. Governing law",
    body: "These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes are subject to the exclusive jurisdiction of the courts of Lagos State, Nigeria.",
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <LegalPageHeader
        eyebrowKey="legal.eyebrow"
        titleKey="legal.terms.title"
        descriptionKey="legal.terms.description"
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
        This document is illustrative and is not legal advice. Consult a qualified Nigerian lawyer before relying on these Terms.
      </p>
    </div>
  );
}
