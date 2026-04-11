// app/booking/success/page.jsx
// Booking Success page — /booking/success
// Shown after payment is completed

'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle,
  ShieldCheck,
  MapPin,
  Building2,
  Calendar,
  Clock,
  Download,
  AlertCircle,
  ArrowRight,
  Phone,
  Mail,
} from 'lucide-react'
import { getRoomById, SERVICE_FEE_RATE } from '../../lib/data'

// ── Helpers ───────────────────────────────────────────────────

function generateBookingRef(roomId) {
  const suffix = roomId?.slice(-6).toUpperCase() || 'XXXXXX'
  return `NL-2026-${suffix}`
}

function formatDate(dateString) {
  if (!dateString) return 'Not specified'
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function getLeaseEnd(moveInDate, leaseType) {
  if (!moveInDate) return ''
  const date = new Date(moveInDate)
  if (leaseType === '1 Year')       date.setFullYear(date.getFullYear() + 1)
  if (leaseType === 'Half Year')    date.setMonth(date.getMonth() + 6)
  if (leaseType === 'Per Semester') date.setMonth(date.getMonth() + 5)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Component ─────────────────────────────────────────────────

function BookingSuccessInner() {

  const searchParams = useSearchParams()
  const roomId    = searchParams.get('roomId')
  const leaseType = searchParams.get('lease') || '1 Year'
  const moveIn    = searchParams.get('moveIn') || ''

  const result = getRoomById(roomId)

  // Fallback if no room data in URL
  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-center px-4">
        <CheckCircle className="w-16 h-16 text-green-500" />
        <h1 className="text-2xl font-bold text-gray-900">Payment Successful!</h1>
        <p className="text-gray-500">Check your email for your booking confirmation.</p>
        <Link
          href="/dashboard"
          className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    )
  }

  const { room, block, property } = result
  const serviceFee = Math.round(room.price * SERVICE_FEE_RATE)
  const total      = room.price + serviceFee
  const bookingRef = generateBookingRef(roomId)

  const nextSteps = [
    {
      icon:  Clock,
      title: '48-Hour Dispute Window',
      desc:  'You have 48 hours to visit the room and confirm it matches the listing. If anything is wrong, file a dispute immediately.',
    },
    {
      icon:  Phone,
      title: 'Contact the Landlord',
      desc:  `Call or message ${property.landlord.name} to arrange your move-in date and collect your key.`,
    },
    {
      icon:  Download,
      title: 'Save Your Receipt',
      desc:  'Download your payment receipt below. Keep it safe as proof of payment.',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Success Hero ── */}
      <div className="bg-green-500 text-white py-14 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Booking Confirmed! 🎉
          </h1>
          <p className="text-green-100 text-lg mb-4">
            Your room has been successfully booked and your payment is in escrow.
          </p>
          <div className="inline-flex items-center gap-3 bg-white/20 border border-white/30 rounded-xl px-5 py-3">
            <span className="text-sm text-green-100">Booking Reference</span>
            <span className="font-mono font-bold text-white text-lg">{bookingRef}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-6">

        {/* ── Booking Summary ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-5">Booking Summary</h2>

          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900">
                  Room {room.number} — {room.type}
                </h3>
                <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </div>
              </div>
              <p className="text-sm text-gray-600">{property.name} · {block.name}</p>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                <MapPin className="w-3 h-3" />
                {property.university} · {property.city}
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Move-In Date', value: formatDate(moveIn)                  },
              { label: 'Lease Ends',   value: getLeaseEnd(moveIn, leaseType)      },
              { label: 'Lease Type',   value: leaseType                           },
              { label: 'Room Type',    value: room.type                           },
              { label: 'Bathroom',     value: room.bathroom                       },
              { label: 'Payment',      value: 'Paid ✓'                            },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{value}</p>
              </div>
            ))}
          </div>

          {/* Payment breakdown */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Room price</span>
              <span className="font-medium text-gray-800">₦{room.price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Service fee (7%)</span>
              <span className="font-medium text-gray-800">₦{serviceFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t border-orange-100 text-base">
              <span className="text-gray-900">Total Paid</span>
              <span className="text-orange-500">₦{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ── Landlord Contact ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            <h2 className="font-bold text-gray-900 text-lg">Landlord Contact Details</h2>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            These details are revealed only after successful payment.
          </p>
          <div className="flex items-start gap-4 bg-gray-50 rounded-xl p-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-orange-500">
                {property.landlord.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-bold text-gray-900">{property.landlord.name}</p>
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-orange-500" />
                  <span>+234 801 234 5678</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-orange-500" />
                  <span>landlord@netlodge.ng</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              If the landlord asks for additional payment outside Netlodge, report it immediately.
            </p>
          </div>
        </div>

        {/* ── Escrow Notice ── */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-1">
                48-Hour Escrow Window is Now Open
              </p>
              <p className="text-sm text-blue-700 leading-relaxed">
                Your payment of <strong>₦{total.toLocaleString()}</strong> is held
                in escrow. Visit the room within 48 hours. If it does not match
                the listing, file a dispute before the window closes.
              </p>
              <Link
                href="/bookings"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline mt-3"
              >
                Go to My Bookings <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Next Steps ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-5">What Happens Next</h2>
          <div className="flex flex-col gap-5">
            {nextSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-0.5">{step.title}</p>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-colors"
          >
            Go to My Dashboard
            <ArrowRight className="w-5 h-5" />
          </Link>
          <button className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 font-bold py-4 rounded-xl transition-colors">
            <Download className="w-5 h-5" />
            Download Receipt
          </button>
        </div>

        <p className="text-center text-sm text-gray-400">
          Need help?{' '}
          <Link href="/contact" className="text-orange-500 hover:underline font-medium">
            Contact Support
          </Link>
        </p>

      </div>
    </div>
  )
}

function SuccessLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading your confirmation...</p>
      </div>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<SuccessLoading />}>
      <BookingSuccessInner />
    </Suspense>
  )
}