// app/(student)/booking/BookingsClient.jsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar, CheckCircle, Clock, XCircle, MapPin, Building2,
  Download, AlertCircle, ChevronDown, ChevronUp, Search, ShieldAlert,
} from 'lucide-react'
import { fileDispute } from '../../../lib/actions/dispute'

const STATUS_CONFIG = {
  Active:    { badge: 'bg-green-100 text-green-700', icon: CheckCircle },
  Pending:   { badge: 'bg-amber-100 text-amber-700', icon: Clock },
  Expired:   { badge: 'bg-gray-100 text-gray-600',   icon: Clock },
  Cancelled: { badge: 'bg-red-100 text-red-600',      icon: XCircle },
}

const DISPUTE_STATUS_CONFIG = {
  pending:          { label: 'Dispute Under Review', badge: 'bg-amber-100 text-amber-700' },
  resolved_refund:  { label: 'Dispute Resolved — Refunded', badge: 'bg-blue-100 text-blue-700' },
  resolved_release: { label: 'Dispute Resolved — Funds Released', badge: 'bg-green-100 text-green-700' },
}

function DisputeForm({ bookingId, onSubmitted }) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (reason.trim().length < 10) {
      setError('Please describe the issue in at least 10 characters.')
      return
    }
    setError('')
    startTransition(async () => {
      const result = await fileDispute(bookingId, reason)
      if ('error' in result) {
        setError(result.error)
        return
      }
      onSubmitted?.()
      router.refresh()
    })
  }

  return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-4 mt-3">
      <p className="text-sm font-semibold text-red-700 mb-2">File a Dispute</p>
      <p className="text-xs text-red-600 mb-3">
        Explain how the room did not match the listing. Our team reviews disputes within 24 hours.
      </p>
      <textarea
        value={reason}
        onChange={(e) => { setReason(e.target.value); if (error) setError('') }}
        rows={3}
        placeholder="e.g. The room shown in photos was not the actual room I was given..."
        className="w-full px-3 py-2.5 rounded-xl border border-red-200 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all resize-none"
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <div className="flex justify-end mt-3">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          {isPending ? 'Submitting...' : 'Submit Dispute'}
        </button>
      </div>
    </div>
  )
}

function BookingCard({ booking }) {
  const [expanded, setExpanded] = useState(false)
  const [disputeFormOpen, setDisputeFormOpen] = useState(false)
  const config = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.Pending
  const Icon = config.icon
  const disputeInfo = booking.disputeStatus && booking.disputeStatus !== 'none'
    ? DISPUTE_STATUS_CONFIG[booking.disputeStatus]
    : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-bold text-gray-900 text-base">{booking.roomLabel}</h3>
                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${config.badge}`}>
                  <Icon className="w-3 h-3" />
                  {booking.status}
                </span>
                {disputeInfo && (
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${disputeInfo.badge}`}>
                    <ShieldAlert className="w-3 h-3" />
                    {disputeInfo.label}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{booking.propertyName} · {booking.blockName}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <MapPin className="w-3 h-3" />
                {booking.university} · {booking.city}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-gray-900">₦{booking.totalAmount.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span className="text-gray-500">Move in:</span>
            <span className="font-semibold text-gray-800">{booking.moveInDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">Lease ends:</span>
            <span className="font-semibold text-gray-800">{booking.leaseEndDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className={`w-4 h-4 ${booking.paymentStatus === 'Paid' ? 'text-green-500' : 'text-gray-400'}`} />
            <span className={`font-semibold ${booking.paymentStatus === 'Paid' ? 'text-green-600' : 'text-gray-500'}`}>
              {booking.paymentStatus}
            </span>
          </div>
        </div>

        {booking.escrowWindowOpen && (
          <div className="flex items-center gap-2 mt-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
            <Clock className="w-4 h-4 text-blue-500 shrink-0" />
            <p className="text-xs text-blue-700">
              Escrow window open — you can still file a dispute if the room doesn't match the listing.
            </p>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-500 transition-colors mt-3 min-h-[44px] py-2 -my-2"
        >
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Hide details</> : <><ChevronDown className="w-3.5 h-3.5" /> Show details</>}
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="pt-4 flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment Breakdown</p>
              <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Room price ({booking.leaseType})</span>
                  <span className="font-medium text-gray-800">₦{booking.roomPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Service fee (7%)</span>
                  <span className="font-medium text-gray-800">₦{booking.serviceFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-1">
                  <span className="text-gray-900">Total Paid</span>
                  <span className="text-orange-500">₦{booking.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-500">Booking Reference</span>
              <span className="font-mono text-sm font-bold text-gray-800">{booking.bookingRef}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="flex items-center gap-2 border border-gray-200 hover:border-orange-300 text-gray-700 hover:text-orange-600 font-medium text-sm px-4 py-2.5 rounded-xl transition-colors">
                <Download className="w-4 h-4" />
                Download Receipt
              </button>
              {booking.escrowWindowOpen && !disputeFormOpen && (
                <button
                  onClick={() => setDisputeFormOpen(true)}
                  className="flex items-center gap-2 border border-red-100 text-red-500 hover:bg-red-50 font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
                >
                  <AlertCircle className="w-4 h-4" />
                  File a Dispute
                </button>
              )}
              {!booking.escrowWindowOpen && !disputeInfo && booking.status === 'Active' && (
                <Link
                  href="/contact"
                  className="flex items-center gap-2 border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
                >
                  <AlertCircle className="w-4 h-4" />
                  Contact Support
                </Link>
              )}
            </div>

            {disputeFormOpen && (
              <DisputeForm bookingId={booking.id} onSubmitted={() => setDisputeFormOpen(false)} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BookingsClient({ bookings }) {
  const activeBookings = bookings.filter((b) => b.status === 'Active' || b.status === 'Pending')
  const pastBookings = bookings.filter((b) => b.status === 'Expired' || b.status === 'Cancelled')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-orange-500" />
            My Bookings
          </h1>
          <p className="text-gray-500 text-sm mt-1">{bookings.length} booking{bookings.length !== 1 ? 's' : ''} total</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {activeBookings.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Active Bookings</h2>
            <div className="flex flex-col gap-4">
              {activeBookings.map((b) => <BookingCard key={b.id} booking={b} />)}
            </div>
          </section>
        )}

        {pastBookings.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Past Bookings</h2>
            <div className="flex flex-col gap-4">
              {pastBookings.map((b) => <BookingCard key={b.id} booking={b} />)}
            </div>
          </section>
        )}

        {bookings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mb-5">
              <Calendar className="w-10 h-10 text-orange-300" />
            </div>
            <h3 className="font-bold text-gray-900 text-xl mb-2">No Bookings Yet</h3>
            <p className="text-gray-500 text-sm mb-8 max-w-xs">
              You have not made any bookings yet. Find a verified room and book it securely.
            </p>
            <Link href="/search" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl transition-colors">
              <Search className="w-5 h-5" />
              Find a Room
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}