// app/landlord/verify/status/LandlordVerifyStatusClient.jsx
'use client'

import Link from 'next/link'
import {
  Clock, CheckCircle, XCircle, ShieldCheck, RefreshCw, Mail, Building2,
} from 'lucide-react'

const STATUS_CONFIG = {
  pending: {
    icon: Clock, iconBg: 'bg-amber-100', iconColor: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700', badgeLabel: 'Under Review',
    title: 'Your Documents Are Being Reviewed',
    description: 'Our admin team reviews all KYC submissions within 48 hours. We will notify you by email and SMS once the review is complete.',
  },
  approved: {
    icon: CheckCircle, iconBg: 'bg-green-100', iconColor: 'text-green-500',
    badge: 'bg-green-100 text-green-700', badgeLabel: 'Verified',
    title: 'You Are Verified! Start Listing Rooms',
    description: 'Your identity and property documents have been confirmed. You can now create your property and start listing rooms.',
  },
  rejected: {
    icon: XCircle, iconBg: 'bg-red-100', iconColor: 'text-red-500',
    badge: 'bg-red-100 text-red-700', badgeLabel: 'Rejected',
    title: 'Verification Was Unsuccessful',
    description: 'We could not verify your submission. Please review your documents on the KYC page and resubmit.',
  },
}

export default function LandlordVerifyStatusClient({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const Icon = config.icon

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg">

          <Link href="/" className="flex items-center gap-2 mb-8 justify-center">
            <ShieldCheck className="w-6 h-6 text-orange-500" />
            <span className="text-xl font-bold text-gray-900">Net<span className="text-orange-500">lodge</span></span>
          </Link>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center mb-5">
            <div className={`w-16 h-16 ${config.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
              <Icon className={`w-8 h-8 ${config.iconColor}`} />
            </div>

            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${config.badge} mb-4`}>
              {config.badgeLabel}
            </span>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">{config.title}</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">{config.description}</p>

            {status === 'approved' && (
              <Link href="/landlord/dashboard" className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-colors">
                <Building2 className="w-5 h-5" /> Go to My Dashboard
              </Link>
            )}

            {status === 'rejected' && (
              <Link href="/landlord/kyc" className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-colors">
                <RefreshCw className="w-5 h-5" /> Resubmit Documents
              </Link>
            )}

            {status === 'pending' && (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-left">
                <Mail className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">We will email and SMS you the moment your review is complete. Most reviews are done within 24 hours.</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-6 text-sm">
            <Link href="/faq" className="text-gray-500 hover:text-orange-500 transition-colors">Landlord FAQ</Link>
            <Link href="/contact" className="text-gray-500 hover:text-orange-500 transition-colors">Contact Support</Link>
            <Link href="/" className="text-gray-500 hover:text-orange-500 transition-colors">Back to Home</Link>
          </div>
        </div>
      </main>
    </div>
  )
}