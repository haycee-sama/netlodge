'use client'
// app/verify/status/page.jsx
// Verification status page — upgraded with:
// 1. Pulsing radar ring animation around the status icon (pending state)
// 2. Rotating status messages that cycle every 3 seconds (pending state)
// 3. Smooth message crossfade transition
// 4. All three states (pending, approved, rejected) preserved

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Clock, CheckCircle, XCircle, ShieldCheck, ArrowRight, RefreshCw, Mail,
} from 'lucide-react'

// ── Change this to preview different states ───────────────────
const STATUS = 'pending'  // 'pending' | 'approved' | 'rejected'

// Status config for each state
const STATUS_CONFIG = {
  pending: {
    icon: Clock, iconBg: 'bg-amber-100', iconColor: 'text-amber-500',
    radarColor: '#f59e0b',
    badge: 'bg-amber-100 text-amber-700', badgeLabel: 'Under Review',
    title: 'Your Documents Are Being Reviewed',
    description: 'Our team is reviewing your documents. This usually takes less than 24 hours. We will notify you by email and SMS once the review is complete.',
  },
  approved: {
    icon: CheckCircle, iconBg: 'bg-green-100', iconColor: 'text-green-500',
    radarColor: null,
    badge: 'bg-green-100 text-green-700', badgeLabel: 'Verified',
    title: 'You Are Verified!',
    description: 'Your student identity has been confirmed. You can now search and book verified rooms on Netlodge.',
  },
  rejected: {
    icon: XCircle, iconBg: 'bg-red-100', iconColor: 'text-red-500',
    radarColor: null,
    badge: 'bg-red-100 text-red-700', badgeLabel: 'Rejected',
    title: 'Verification Was Unsuccessful',
    description: 'Unfortunately we could not verify your identity with the documents submitted. Please review the reason below and resubmit.',
  },
}

// Cycling status messages shown during pending state
const PENDING_MESSAGES = [
  'Documents received and queued',
  'Running automated NIN/BVN checks',
  'Queued for manual admin review',
  'Admin review in progress',
  'Almost there — finalising checks',
]

const SUBMITTED_DOCS = [
  { label: 'Student ID Card',  done: true  },
  { label: 'NIN Verification', done: true  },
  { label: 'University Email', done: false },
]

const REJECTION_REASON =
  'The student ID you uploaded appears to be expired. Please upload a valid, current student ID or your current session admission letter.'

// ── Pending Status — with radar rings and cycling text ────────
function PendingStatus({ config }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [visible, setVisible]   = useState(true)

  useEffect(() => {
    // Cycle message every 3 seconds with a crossfade
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % PENDING_MESSAGES.length)
        setVisible(true)
      }, 300)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center mb-6">
      {/* Icon with radar rings */}
      <div className="relative w-20 h-20 flex items-center justify-center mb-5">
        {/* Three pulsing rings at different delays */}
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="radar-ring absolute inset-0"
            style={{
              color: config.radarColor,
              animationDelay: `${i * 0.6}s`,
            }}
          />
        ))}
        {/* Icon in the center */}
        <div className={`relative z-10 w-16 h-16 ${config.iconBg} rounded-2xl flex items-center justify-center`}>
          <Clock className={`w-8 h-8 ${config.iconColor}`} />
        </div>
      </div>

      {/* Cycling status message */}
      <div className="h-6 flex items-center justify-center">
        <p
          className="text-sm font-medium text-amber-600 transition-opacity duration-300"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {PENDING_MESSAGES[msgIndex]}
        </p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function VerifyStatusPage() {
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

          {/* Pending state uses animated component; others use static icon */}
          {STATUS === 'pending' ? (
            <PendingStatus config={config} />
          ) : (
            <div className={`w-16 h-16 ${config.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
              <Icon className={`w-8 h-8 ${config.iconColor}`} />
            </div>
          )}

          {/* Badge */}
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
              {SUBMITTED_DOCS.map(doc => (
                <div key={doc.label} className="flex items-center gap-2">
                  {doc.done
                    ? <CheckCircle className="w-4 h-4 text-green-500" />
                    : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  }
                  <span className={`text-sm ${doc.done ? 'text-gray-700' : 'text-gray-400'}`}>
                    {doc.label}
                    {!doc.done && <span className="text-xs ml-1">(not submitted)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA based on status */}
          {STATUS === 'approved' && (
            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-colors"
            >
              Go to My Dashboard <ArrowRight className="w-5 h-5" />
            </Link>
          )}

          {STATUS === 'rejected' && (
            <Link
              href="/verify/student"
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-colors"
            >
              <RefreshCw className="w-5 h-5" /> Resubmit My Documents
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

        {/* Bottom links */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <Link href="/faq"     className="text-gray-500 hover:text-orange-500 transition-colors">Verification FAQ</Link>
          <Link href="/contact" className="text-gray-500 hover:text-orange-500 transition-colors">Contact Support</Link>
          <Link href="/"        className="text-gray-500 hover:text-orange-500 transition-colors">Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
