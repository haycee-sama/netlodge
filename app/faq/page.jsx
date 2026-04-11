'use client'
// app/faq/page.jsx
// FAQ page — upgraded with:
// 1. Smooth CSS max-height accordion (no layout jump)
// 2. Scroll-triggered stagger reveal for FAQ items
// 3. Hero entrance animation

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ShieldCheck, GraduationCap, Building2 } from 'lucide-react'
import useScrollReveal from '../hooks/useScrollReveal'

// ── FAQ Data ──────────────────────────────────────────────────

const STUDENT_FAQS = [
  {
    question: 'Is Netlodge free to use as a student?',
    answer:
      'Creating an account and searching for rooms is completely free. A service fee of 5–8% is only charged when you complete a booking. This fee is shown transparently before you confirm payment — no hidden charges.',
  },
  {
    question: 'How do I know a listing is real and not a scam?',
    answer:
      'Every property on Netlodge has been verified by our admin team. Landlords must submit a government-issued ID and proof of property ownership (Certificate of Occupancy or deed) before they can list any rooms. No listing goes live without manual approval.',
  },
  {
    question: 'What happens to my money after I pay?',
    answer:
      'Your payment goes into an escrow account — not directly to the landlord. It stays there for 48 hours. During this time you can visit the room and confirm it matches the listing. If everything is fine, the funds are automatically released to the landlord. If not, you can file a dispute and receive a full refund.',
  },
  {
    question: 'What if the room does not match the photos?',
    answer:
      'You have 48 hours after payment to file a dispute. Go to your dashboard, open the booking, and click the dispute button. Upload evidence (photos, description). Our team reviews within 24 hours. If we find the listing was misrepresented, you receive a full refund.',
  },
  {
    question: 'How long does student verification take?',
    answer:
      'Most student verifications are completed within 24 hours. You will receive an email and SMS notification once your account is verified. If your documents are rejected, you will be told exactly why and given the chance to resubmit.',
  },
  {
    question: 'Can I pay per semester instead of for a full year?',
    answer:
      'It depends on the landlord. Some landlords on Netlodge allow per-semester or half-year payment options. You will see the available payment options on each room listing page before booking.',
  },
  {
    question: 'What payment methods are accepted?',
    answer:
      'We accept debit/credit card, bank transfer, and USSD. All payments are processed through Paystack, a trusted Nigerian payment gateway. Your card details are never stored on Netlodge servers.',
  },
  {
    question: "When do I get the landlord's phone number?",
    answer:
      "For your protection, landlord contact details are only revealed after a successful booking payment. This prevents scammers from collecting your number and contacting you outside the platform.",
  },
]

const LANDLORD_FAQS = [
  {
    question: 'What documents do I need to list my property?',
    answer:
      "You need a valid government-issued ID (NIN card, international passport, or driver's license) and proof of property ownership such as a Certificate of Occupancy, deed of assignment, or survey plan. You will also need to submit geo-tagged photos of the property taken on-site.",
  },
  {
    question: 'How long does KYC verification take?',
    answer:
      'Our admin team reviews all submitted documents within 48 hours. If your documents pass our automated check, they go straight to manual review. If anything is unclear or missing, you will be notified immediately with specific instructions for resubmission.',
  },
  {
    question: 'How do I receive payments from bookings?',
    answer:
      'You register a Nigerian bank account during setup. After a student books a room and the 48-hour escrow window closes without a dispute, the room price minus the platform service fee is automatically sent to your registered bank account.',
  },
  {
    question: 'What is the platform service fee?',
    answer:
      "Netlodge charges students a 5–8% service fee on each booking. This fee is taken from the student's total payment — not from your room price. You receive the full room price you set, minus any payment processing charges.",
  },
  {
    question: 'Can I manage multiple properties on one account?',
    answer:
      'Yes. You can create multiple properties under one landlord account. Each property can have multiple blocks, and each block can have multiple rooms. You can manage all of them from your landlord dashboard.',
  },
  {
    question: 'Can I add agents to manage my property?',
    answer:
      'Yes — but only in Phase 2 of the platform. When the agent module launches, you will be able to invite verified agents, assign them to specific blocks, set their permissions, and track their activity.',
  },
  {
    question: 'What if a student disputes a booking unfairly?',
    answer:
      'Both parties are heard. When a dispute is filed, our admin team reviews evidence from the student and from you. You can submit photos, messages, and any proof that the room matched the listing. If we find the dispute is unfounded, funds are released to you in full.',
  },
  {
    question: 'Can I mark a room as unavailable without a booking?',
    answer:
      'Yes. From your dashboard you can mark any room as "Under Maintenance" or reserve it manually. This removes it from search results without requiring a booking.',
  },
]

// ── Sub-components ────────────────────────────────────────────

function FAQItem({ question, answer, index, openIndex, setOpenIndex }) {
  const isOpen = openIndex === index

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpenIndex(isOpen ? null : index)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 text-sm pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Smooth CSS max-height transition — no layout jump */}
      <div className={`faq-body ${isOpen ? 'open' : ''}`}>
        <div className="px-5 pb-5 bg-white border-t border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed pt-4">{answer}</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────

export default function FAQPage() {
  useScrollReveal()

  const [studentOpen, setStudentOpen]   = useState(null)
  const [landlordOpen, setLandlordOpen] = useState(null)

  return (
    <div className="min-h-screen bg-gray-50 page-enter">

      {/* ── Hero ── */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="hero-animate hero-delay-0 flex items-center justify-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-medium text-orange-400 uppercase tracking-wider">
              Help Centre
            </span>
          </div>
          <h1 className="hero-animate hero-delay-1 text-4xl sm:text-5xl font-bold mb-4">
            Frequently Asked Questions
          </h1>
          <p className="hero-animate hero-delay-2 text-gray-300 max-w-xl mx-auto">
            Everything you need to know about finding rooms, making payments,
            and staying protected on Netlodge.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ── Student FAQs ── */}
        <div className="mb-14 reveal">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">For Students</h2>
              <p className="text-sm text-gray-500">Questions about searching, booking, and payments</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {STUDENT_FAQS.map((faq, index) => (
              <FAQItem
                key={index}
                index={index}
                question={faq.question}
                answer={faq.answer}
                openIndex={studentOpen}
                setOpenIndex={setStudentOpen}
              />
            ))}
          </div>
        </div>

        {/* ── Landlord FAQs ── */}
        <div className="mb-14 reveal">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">For Landlords</h2>
              <p className="text-sm text-gray-500">Questions about listing, verification, and payments</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {LANDLORD_FAQS.map((faq, index) => (
              <FAQItem
                key={index}
                index={index}
                question={faq.question}
                answer={faq.answer}
                openIndex={landlordOpen}
                setOpenIndex={setLandlordOpen}
              />
            ))}
          </div>
        </div>

        {/* ── Still have questions ── */}
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-8 text-center reveal">
          <h3 className="font-bold text-gray-900 text-lg mb-2">
            Still Have Questions?
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Our support team is available Monday to Saturday, 8am to 8pm WAT.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Contact Support
          </Link>
        </div>

      </div>
    </div>
  )
}
