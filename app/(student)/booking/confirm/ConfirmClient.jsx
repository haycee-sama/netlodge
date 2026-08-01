// app/(student)/booking/confirm/ConfirmClient.jsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck, MapPin, Building2, Calendar, ChevronLeft,
  ArrowRight, CheckCircle, AlertCircle, Lock,
} from 'lucide-react'
import { createBooking } from '../../../../lib/actions/booking'
import BookingProgress from '../components/BookingProgress'

// Display label <-> DB enum value mapping — kept in one place so the
// UI's friendly labels and the schema's lease_duration enum never drift.
const LEASE_LABEL_TO_ENUM = { '1 Year': 'full_year', 'Per Semester': 'per_semester', 'Half Year': 'half_year' }

function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ConfirmClient({ room, block, property, initialLeaseLabel }) {
  const router = useRouter()

  const leaseLabel = LEASE_LABEL_TO_ENUM[initialLeaseLabel] ? initialLeaseLabel : '1 Year'
  const leaseType = LEASE_LABEL_TO_ENUM[leaseLabel]

  const [moveInDate, setMoveInDate] = useState('')
  const [dateError, setDateError]   = useState('')
  const [agreed, setAgreed]         = useState(false)
  const [agreeError, setAgreeError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading]       = useState(false)

  const serviceFee = Math.round(room.price * 0.07)
  const total = room.price + serviceFee

  async function handleProceed() {
    let hasError = false
    if (!moveInDate) { setDateError('Please select a move-in date'); hasError = true } else setDateError('')
    if (!agreed) { setAgreeError('You must agree to the terms before proceeding'); hasError = true } else setAgreeError('')
    if (hasError) return

    setLoading(true)
    setSubmitError('')

    const result = await createBooking(room.id, leaseType, moveInDate)

    setLoading(false)

    if ('error' in result) {
      setSubmitError(result.error)
      return
    }

    router.push(`/booking/pay?bookingId=${result.bookingId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BookingProgress step={0} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`/rooms/${room.id}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" />
          Back to Room Details
        </Link>

        {submitError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Room You Are Booking</h2>
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="w-8 h-8 text-gray-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">Room {room.number} — {room.type}</h3>
                    <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">{property.name} · {block.name}</p>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {property.university} · {property.city}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-5">
                {[
                  { label: 'Room Type', value: room.type },
                  { label: 'Bathroom', value: room.bathroom },
                  { label: 'Furnished', value: room.furnished },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Lease Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lease Duration</label>
                  <div className="px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
                    <p className="text-sm font-bold text-orange-600">{leaseLabel}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">To change duration go back to the room page</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Move-In Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    min={getTodayString()}
                    value={moveInDate}
                    onChange={(e) => { setMoveInDate(e.target.value); setDateError('') }}
                    className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 transition-all ${
                      dateError ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
                    }`}
                  />
                  {dateError && <p className="text-xs text-red-500 mt-1">{dateError}</p>}
                </div>
              </div>
              {moveInDate && (
                <div className="mt-4 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Move-in date</p>
                    <p className="text-sm font-bold text-gray-800">{formatDate(moveInDate)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 mb-2">Your Payment is Protected by Escrow</p>
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

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <button
                role="checkbox"
                aria-checked={agreed}
                onClick={() => { setAgreed(!agreed); setAgreeError('') }}
                className={`flex items-start gap-3 w-full text-left p-4 rounded-xl border-2 transition-all ${
                  agreed ? 'border-orange-400 bg-orange-50' : agreeError ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
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
                  <Link href="/terms" className="text-orange-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                    Terms of Use
                  </Link>{' '}
                  and understand that the 7% service fee is non-refundable unless the landlord is found to be at fault in a dispute.
                </p>
              </button>
              {agreeError && <p className="text-xs text-red-500 mt-2">{agreeError}</p>}
            </div>

          </div>

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
                    <span className="font-medium text-gray-800">{leaseLabel}</span>
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
                <button
                  onClick={handleProceed}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 active:scale-[0.98] text-white font-bold py-4 rounded-xl transition-all text-base"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating Booking...
                    </>
                  ) : (
                    <>
                      Proceed to Payment
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-gray-500 mt-3">You will review your payment on the next screen</p>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800 mb-1">Verified & Protected</p>
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