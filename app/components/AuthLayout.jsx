// app/components/AuthLayout.jsx
// Reusable two-column layout for all auth pages
// Left side: the form content (passed as children)
// Right side: trust signals panel (same on every auth page)

import Link from 'next/link'
import { ShieldCheck, CheckCircle } from 'lucide-react'

// Trust points shown on the right panel of every auth page
const TRUST_POINTS = [
  'Every landlord is manually verified by our team',
  'Your payment is protected by escrow for 48 hours',
  'File a dispute if your room does not match the listing',
  'No off-platform payments ever facilitated',
  'Your documents are encrypted and never shared',
]

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Left side — Form ── */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-8 lg:px-16">
        <div className="w-full max-w-md mx-auto">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-8">
            <ShieldCheck className="w-6 h-6 text-orange-500" />
            <span className="text-xl font-bold text-gray-900">
              Net<span className="text-orange-500">lodge</span>
            </span>
          </Link>

          {/* Page title + subtitle */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-500 text-sm">{subtitle}</p>
          </div>

          {/* The actual form content */}
          {children}

        </div>
      </div>

      {/* ── Right side — Trust Panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:flex-1 bg-gray-900 text-white flex-col justify-center px-16">
        <div className="max-w-sm">

          {/* Icon */}
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mb-8">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>

          <h2 className="text-3xl font-bold mb-3">
            Nigeria's Most Trusted Student Housing Platform
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Every feature on Netlodge was built specifically to protect
            students from the fraud that has plagued off-campus housing for decades.
          </p>

          {/* Trust checklist */}
          <ul className="flex flex-col gap-4">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <span className="text-sm text-gray-300">{point}</span>
              </li>
            ))}
          </ul>

          {/* City badges */}
          <div className="flex gap-2 mt-10">
            {['Abuja', 'Lagos', 'Enugu'].map((city) => (
              <span
                key={city}
                className="text-xs bg-gray-800 text-gray-400 px-3 py-1.5 rounded-full"
              >
                {city}
              </span>
            ))}
          </div>

        </div>
      </div>

    </div>
  )
}