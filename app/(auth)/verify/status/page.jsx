// app/verify/status/page.jsx
// Verification status page — /verify/status
// Shows the student their current verification state
// Three possible states: pending, approved, rejected

import Link from 'next/link'
import {
  Clock,
  CheckCircle,
  XCircle,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Mail,
  FileCheck,
} from 'lucide-react'

// ── Mock status data ──────────────────────────────────────────
// In the real app this comes from your API
// Change STATUS to 'pending' | 'approved' | 'rejected' to preview each state

const STATUS = 'pending'

const STATUS_CONFIG = {
  pending: {
    icon:        Clock,
    iconBg:      'bg-amber-100',
    iconColor:   'text-amber-500',
    badge:       'bg-amber-100 text-amber-700',
    badgeLabel:  'Under Review',
    title:       'Your Verification Is Being Reviewed',
    description: 'Our team is reviewing your documents. This usually takes less than 24 hours. We will notify you by email and SMS once the review is complete.',
  },
  approved: {
    icon:        CheckCircle,
    iconBg:      'bg-green-100',
    iconColor:   'text-green-500',
    badge:       'bg-green-100 text-green-700',
    badgeLabel:  'Verified',
    title:       'You Are Verified!',
    description: 'Your student identity has been confirmed. You can now search and book verified rooms on Netlodge.',
  },
  rejected: {
    icon:        XCircle,
    iconBg:      'bg-red-100',
    iconColor:   'text-red-500',
    badge:       'bg-red-100 text-red-700',
    badgeLabel:  'Rejected',
    title:       'Verification Was Unsuccessful',
    description: 'Unfortunately we could not verify your identity with the documents submitted. Please review the reason below and resubmit.',
  },
}

// What was submitted — shown as a checklist
const SUBMITTED_DOCS = [
  { label: 'Student ID Card',   done: true },
  { label: 'NIN Verification',  done: true },
  { label: 'University Email',  done: false },
]

// Rejection reason — only shown when STATUS is 'rejected'
const REJECTION_REASON =
  'The student ID you uploaded appears to be expired. Please upload a valid, current student ID or your current session admission letter.'

export default function VerifyStatusPage() {

  const config  = STATUS_CONFIG[STATUS]
  const Icon    = config.icon

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-8 justify-center">
          <ShieldCheck className="w-6 h-6 text-orange-500" />
          <span className="text-xl font-bold text-gray-900">
            Net<span className="text-orange-500">lodge</span>
          </span>
        </Link>

        {/* ── Status Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center mb-5">

          {/* Status icon */}
          <div className={`w-16 h-16 ${config.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
            <Icon className={`w-8 h-8 ${config.iconColor}`} />
          </div>

          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${config.badge} mb-4`}>
            {config.badgeLabel}
          </span>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">{config.title}</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            {config.description}
          </p>

          {/* ── Rejection reason ── */}
          {STATUS === 'rejected' && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-left mb-6">
              <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-600">{REJECTION_REASON}</p>
            </div>
          )}

          {/* ── Submitted documents checklist ── */}
          <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Documents Submitted
            </p>
            <div className="flex flex-col gap-2">
              {SUBMITTED_DOCS.map((doc) => (
                <div key={doc.label} className="flex items-center gap-2">
                  {doc.done ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={`text-sm ${doc.done ? 'text-gray-700' : 'text-gray-400'}`}>
                    {doc.label}
                    {!doc.done && (
                      <span className="text-xs ml-1">(not submitted)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── CTA based on status ── */}
          {STATUS === 'approved' && (
            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-colors"
            >
              Go to My Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}

          {STATUS === 'rejected' && (
            <Link
              href="/verify/student"
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Resubmit My Documents
            </Link>
          )}

          {STATUS === 'pending' && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-left">
              <Mail className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                We will send an email and SMS to notify you the moment your
                verification is complete. No need to keep checking this page.
              </p>
            </div>
          )}

        </div>

        {/* ── Bottom links ── */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <Link href="/faq" className="text-gray-500 hover:text-orange-500 transition-colors">
            Verification FAQ
          </Link>
          <Link href="/contact" className="text-gray-500 hover:text-orange-500 transition-colors">
            Contact Support
          </Link>
          <Link href="/" className="text-gray-500 hover:text-orange-500 transition-colors">
            Back to Home
          </Link>
        </div>

      </div>
    </div>
  )
}