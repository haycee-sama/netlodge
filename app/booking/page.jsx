// app/bookings/page.jsx
// My Bookings page — /bookings
// Shows current and past bookings with payment status and receipts

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Building2,
  Download,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Search,
} from 'lucide-react'

// ── Mock bookings data ────────────────────────────────────────
const BOOKINGS = [
  {
    id:          'BK-2026-0042',
    room:        'Room A05 — Self-Contain',
    property:    'Sunrise Hostel',
    block:       'Block A',
    university:  'University of Abuja',
    city:        'Abuja',
    moveIn:      'April 1, 2026',
    leaseEnd:    'March 31, 2027',
    price:       180000,
    serviceFee:  12600,
    total:       192600,
    status:      'Active',
    paymentStatus: 'Paid',
    paidOn:      'March 25, 2026',
    leaseType:   '1 Year',
  },
  {
    id:          'BK-2025-0018',
    room:        'Room B03 — Single',
    property:    'Fountain Hostel',
    block:       'Block B',
    university:  'University of Abuja',
    city:        'Abuja',
    moveIn:      'April 1, 2025',
    leaseEnd:    'March 31, 2026',
    price:       120000,
    serviceFee:  8400,
    total:       128400,
    status:      'Expired',
    paymentStatus: 'Paid',
    paidOn:      'March 20, 2025',
    leaseType:   '1 Year',
  },
]

// Status config controls badge colors
const STATUS_CONFIG = {
  Active: {
    badge: 'bg-green-100 text-green-700',
    icon:  CheckCircle,
    color: 'text-green-500',
  },
  Expired: {
    badge: 'bg-gray-100 text-gray-600',
    icon:  Clock,
    color: 'text-gray-400',
  },
  Cancelled: {
    badge: 'bg-red-100 text-red-600',
    icon:  XCircle,
    color: 'text-red-500',
  },
}

// ── Sub-component — Single Booking Card ───────────────────────

function BookingCard({ booking }) {

  const [expanded, setExpanded] = useState(false)
  const config  = STATUS_CONFIG[booking.status]
  const Icon    = config.icon

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ── Card Header — always visible ── */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">

          {/* Left — room info */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900 text-base">{booking.room}</h3>
                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${config.badge}`}>
                  <Icon className="w-3 h-3" />
                  {booking.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">{booking.property} · {booking.block}</p>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                <MapPin className="w-3 h-3" />
                {booking.university} · {booking.city}
              </div>
            </div>
          </div>

          {/* Right — price */}
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-gray-900">
              ₦{booking.total.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">Total paid</p>
          </div>
        </div>

        {/* Lease dates row */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span className="text-gray-500">Move in:</span>
            <span className="font-semibold text-gray-800">{booking.moveIn}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">Lease ends:</span>
            <span className="font-semibold text-gray-800">{booking.leaseEnd}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-green-600">{booking.paymentStatus}</span>
            <span className="text-gray-400">· {booking.paidOn}</span>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors mt-3"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Hide details
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Show details
            </>
          )}
        </button>
      </div>

      {/* ── Expanded Details ── */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="pt-4 flex flex-col gap-4">

            {/* Payment breakdown */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Payment Breakdown
              </p>
              <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Room price ({booking.leaseType})</span>
                  <span className="font-medium text-gray-800">
                    ₦{booking.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Service fee (7%)</span>
                  <span className="font-medium text-gray-800">
                    ₦{booking.serviceFee.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-1">
                  <span className="text-gray-900">Total Paid</span>
                  <span className="text-orange-500">
                    ₦{booking.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Booking ref */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-500">Booking Reference</span>
              <span className="font-mono text-sm font-bold text-gray-800">
                {booking.id}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">

              {/* Download receipt */}
              <button className="flex items-center gap-2 border border-gray-200 hover:border-orange-300 text-gray-700 hover:text-orange-600 font-medium text-sm px-4 py-2.5 rounded-xl transition-colors">
                <Download className="w-4 h-4" />
                Download Receipt
              </button>

              {/* File dispute — only on active bookings */}
              {booking.status === 'Active' && (
                <Link
                  href="/contact"
                  className="flex items-center gap-2 border border-red-100 text-red-500 hover:bg-red-50 font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
                >
                  <AlertCircle className="w-4 h-4" />
                  File a Dispute
                </Link>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  )
}

// ── Main Component ────────────────────────────────────────────

export default function BookingsPage() {

  const activeBookings  = BOOKINGS.filter((b) => b.status === 'Active')
  const pastBookings    = BOOKINGS.filter((b) => b.status !== 'Active')

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-orange-500" />
            My Bookings
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {BOOKINGS.length} booking{BOOKINGS.length !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">

        {/* ── Active Bookings ── */}
        {activeBookings.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Active Bookings
            </h2>
            <div className="flex flex-col gap-4">
              {activeBookings.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          </section>
        )}

        {/* ── Past Bookings ── */}
        {pastBookings.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Past Bookings
            </h2>
            <div className="flex flex-col gap-4">
              {pastBookings.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {BOOKINGS.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mb-5">
              <Calendar className="w-10 h-10 text-orange-300" />
            </div>
            <h3 className="font-bold text-gray-900 text-xl mb-2">No Bookings Yet</h3>
            <p className="text-gray-500 text-sm mb-8 max-w-xs">
              You have not made any bookings yet. Find a verified room and book it securely.
            </p>
            <Link
              href="/search"
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl transition-colors"
            >
              <Search className="w-5 h-5" />
              Find a Room
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}