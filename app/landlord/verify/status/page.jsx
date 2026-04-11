// app/landlord/verify/status/page.jsx
// Landlord KYC verification status — /landlord/verify/status
// Three states: pending | approved | rejected
// Change STATUS below to preview each state

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
  Building2,
} from 'lucide-react'

// ── Change this to preview different states ───────────────────
const STATUS = 'approved'  // 'pending' | 'approved' | 'rejected'

const STATUS_CONFIG = {
  pending: {
    icon:        Clock,
    iconBg:      'bg-amber-100',
    iconColor:   'text-amber-500',
    badge:       'bg-amber-100 text-amber-700',
    badgeLabel:  'Under Review',
    title:       'Your Documents Are Being Reviewed',
    description: 'Our admin team reviews all KYC submissions within 48 hours. We will notify you by email and SMS once the review is complete.',
  },
  approved: {
    icon:        CheckCircle,
    iconBg:      'bg-green-100',
    iconColor:   'text-green-500',
    badge:       'bg-green-100 text-green-700',
    badgeLabel:  'Verified',
    title:       'You Are Verified! Start Listing Rooms',
    description: 'Your identity and property documents have been confirmed. You can now create your property and start listing rooms.',
  },
  rejected: {
    icon:        XCircle,
    iconBg:      'bg-red-100',
    iconColor:   'text-red-500',
    badge:       'bg-red-100 text-red-700',
    badgeLabel:  'Rejected',
    title:       'Verification Was Unsuccessful',
    description: 'We could not verify your submission. Please review the reason below and resubmit the correct documents.',
  },
}

const SUBMITTED_DOCS = [
  { label: 'Government ID',       done: true  },
  { label: 'Certificate of Occupancy', done: true },
  { label: 'Geo-Tagged Photos',   done: true  },
  { label: 'NIN Verification',    done: true  },
]

const REJECTION_REASON =
  'The Certificate of Occupancy you uploaded appears to be for a different property address than the geo-tagged photos submitted. Please ensure all documents refer to the same property and resubmit.'

export default function LandlordVerifyStatusPage() {

  const config = STATUS_CONFIG[STATUS]
  const Icon   = config.icon

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

        {/* Status Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center mb-5">

          <div className={`w-16 h-16 ${config.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
            <Icon className={`w-8 h-8 ${config.iconColor}`} />
          </div>

          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${config.badge} mb-4`}>
            {config.badgeLabel}
          </span>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">{config.title}</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">{config.description}</p>

          {/* Rejection reason */}
          {STATUS === 'rejected' && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-left mb-6">
              <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-600">{REJECTION_REASON}</p>
            </div>
          )}

          {/* Submitted docs checklist */}
          <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Documents Submitted
            </p>
            <div className="flex flex-col gap-2">
              {SUBMITTED_DOCS.map((doc) => (
                <div key={doc.label} className="flex items-center gap-2">
                  {doc.done
                    ? <CheckCircle className="w-4 h-4 text-green-500" />
                    : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  }
                  <span className={`text-sm ${doc.done ? 'text-gray-700' : 'text-gray-400'}`}>
                    {doc.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          {STATUS === 'approved' && (
            <Link
              href="/landlord/dashboard"
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-colors"
            >
              <Building2 className="w-5 h-5" />
              Go to My Dashboard
            </Link>
          )}

          {STATUS === 'rejected' && (
            <Link
              href="/landlord/kyc"
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Resubmit Documents
            </Link>
          )}

          {STATUS === 'pending' && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-left">
              <Mail className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                We will email and SMS you the moment your review is complete.
                Most reviews are done within 24 hours.
              </p>
            </div>
          )}

        </div>

        <div className="flex items-center justify-center gap-6 text-sm">
          <Link href="/faq" className="text-gray-500 hover:text-orange-500 transition-colors">
            Landlord FAQ
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