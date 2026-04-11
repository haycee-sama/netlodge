// app/booking/confirm/page.jsx
// Booking Confirmation page — /booking/confirm

'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ShieldCheck,
  MapPin,
  Building2,
  Calendar,
  ChevronLeft,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Lock,
} from 'lucide-react'
import { getRoomById, SERVICE_FEE_RATE } from '../../lib/data'

// ── Helpers ───────────────────────────────────────────────────

function getLeaseEndDate(moveInDate, leaseType) {
  if (!moveInDate) return ''
  const date = new Date(moveInDate)
  if (leaseType === '1 Year')       date.setFullYear(date.getFullYear() + 1)
  if (leaseType === 'Half Year')    date.setMonth(date.getMonth() + 6)
  if (leaseType === 'Per Semester') date.setMonth(date.getMonth() + 5)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Inner component — uses useSearchParams ────────────────────
// Must be separate from the export so Suspense can wrap it

function BookingConfirmInner() {

  const searchParams = useSearchParams()
  const router       = useRouter()

  const roomId    = searchParams.get('roomId')
  const leaseType = searchParams.get('lease') || '1 Year'

  const result = getRoomById(roomId)

  const [moveInDate, setMoveInDate] = useState('')
  const [dateError, setDateError]   = useState('')
  const [agreed, setAgreed]         = useState(false)
  const [agreeError, setAgreeError] = useState('')

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-center px-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-bold text-gray-900">No room selected</h2>
        <p className="text-gray-500 text-sm">
          Please go back and select a room before proceeding to checkout.
        </p>
        <Link
          href="/search"
          className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors"
        >
          Back to Search
        </Link>
      </div>
    )
  }

  const { room, block, property } = result
  const serviceFee = Math.round(room.price * SERVICE_FEE_RATE)
  const total      = room.price + serviceFee

  function handleProceed() {
    let hasError = false
    if (!moveInDate) {
      setDateError('Please select a move-in date')
      hasError = true
    } else {
      setDateError('')
    }
    if (!agreed) {
      setAgreeError('You must agree to the terms before proceeding')
      hasError = true
    } else {
      setAgreeError('')
    }
    if (hasError) return
    router.push(
      `/booking/pay?roomId=${roomId}&lease=${encodeURIComponent(leaseType)}&moveIn=${moveInDate}`
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Progress Bar ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2">
            {['Review & Confirm', 'Payment', 'Booking Complete'].map((step, index) => {
              const isActive   = index === 0
              const isComplete = index < 0
              return (
                <div key={step} className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isComplete
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isComplete ? <CheckCircle className="w-4 h-4" /> : index + 1}
                    </div>
                    <span className={`text-sm font-medium hidden sm:block ${
                      isActive ? 'text-orange-500' : 'text-gray-400'
                    }`}>
                      {step}
                    </span>
                  </div>
                  {index < 2 && (
                    <div className={`h-0.5 w-8 sm:w-16 ${
                      isComplete ? 'bg-green-500' : 'bg-gray-100'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Link
          href={`/rooms/${roomId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Room Details
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left — Confirmation Details ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Room Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Room You Are Booking</h2>
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="w-8 h-8 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">
                      Room {room.number} — {room.type}
                    </h3>
                    <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    {property.name} · {block.name}
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {property.university} · {property.city}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-5">
                {[
                  { label: 'Room Type', value: room.type                              },
                  { label: 'Bathroom',  value: room.bathroom                          },
                  { label: 'Furnished', value: room.furnished === 'Yes' ? 'Yes' : 'No'},
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Lease Details */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Lease Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lease Duration
                  </label>
                  <div className="px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
                    <p className="text-sm font-bold text-orange-600">{leaseType}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    To change duration go back to the room page
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Move-In Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    min={getTodayString()}
                    value={moveInDate}
                    onChange={(e) => {
                      setMoveInDate(e.target.value)
                      setDateError('')
                    }}
                    className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 transition-all ${
                      dateError
                        ? 'border-red-300 focus:ring-red-100'
                        : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
                    }`}
                  />
                  {dateError && (
                    <p className="text-xs text-red-500 mt-1">{dateError}</p>
                  )}
                </div>
              </div>
              {moveInDate && (
                <div className="mt-4 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Estimated lease end date</p>
                    <p className="text-sm font-bold text-gray-800">
                      {getLeaseEndDate(moveInDate, leaseType)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Escrow Notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 mb-2">
                    Your Payment is Protected by Escrow
                  </p>
                  <ul className="flex flex-col gap-2">
                    {[
                      'Your payment will be held securely for 48 hours after booking',
                      'You can visit the room and confirm it matches the listing during this time',
                      'If the room does not match you can file a dispute and receive a full refund',
                      'Funds are only released to the landlord after the 48-hour window closes',
                    ].map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-blue-700">
                        <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Before You Proceed</h2>
              <button
                onClick={() => {
                  setAgreed(!agreed)
                  setAgreeError('')
                }}
                className={`flex items-start gap-3 w-full text-left p-4 rounded-xl border-2 transition-all ${
                  agreed
                    ? 'border-orange-400 bg-orange-50'
                    : agreeError
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  agreed ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                }`}>
                  {agreed && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  I confirm that I have read and understood the house rules for {property.name}.
                  I agree to Netlodge's{' '}
                  <Link
                    href="/terms"
                    className="text-orange-500 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms of Use
                  </Link>{' '}
                  and understand that the 7% service fee is non-refundable unless the landlord
                  is found to be at fault in a dispute.
                </p>
              </button>
              {agreeError && (
                <p className="text-xs text-red-500 mt-2">{agreeError}</p>
              )}
            </div>

          </div>

          {/* ── Right — Price Summary ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 flex flex-col gap-4">

              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
                <h3 className="font-bold text-gray-900 mb-5">Price Summary</h3>
                <div className="flex flex-col gap-3 pb-4 border-b border-gray-100 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Room price</span>
                    <span className="font-medium text-gray-800">₦{room.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Lease type</span>
                    <span className="font-medium text-gray-800">{leaseType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service fee (7%)</span>
                    <span className="font-medium text-gray-800">₦{serviceFee.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-base mb-6">
                  <span className="text-gray-900">Total</span>
                  <span className="text-orange-500">₦{total.toLocaleString()}</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 mb-5 flex flex-col gap-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Move-in</span>
                    <span className="font-semibold text-gray-700">
                      {moveInDate ? formatDate(moveInDate) : 'Not selected'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Lease ends</span>
                    <span className="font-semibold text-gray-700">
                      {moveInDate ? getLeaseEndDate(moveInDate, leaseType) : '—'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleProceed}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold py-4 rounded-xl transition-all text-base"
                >
                  Proceed to Payment
                  <ArrowRight className="w-5 h-5" />
                </button>
                <p className="text-center text-xs text-gray-400 mt-3">
                  You will review your payment on the next screen
                </p>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800 mb-1">
                      Verified & Protected
                    </p>
                    <p className="text-xs text-green-700 leading-relaxed">
                      This property has been manually verified by the Netlodge team.
                      Your payment is escrow-protected for 48 hours.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Loading fallback ──────────────────────────────────────────

function ConfirmLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading booking details...</p>
      </div>
    </div>
  )
}

// ── Default export wraps inner component in Suspense ──────────

export default function BookingConfirmPage() {
  return (
    <Suspense fallback={<ConfirmLoading />}>
      <BookingConfirmInner />
    </Suspense>
  )
}