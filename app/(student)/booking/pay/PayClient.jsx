// app/(student)/booking/pay/PayClient.jsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck, ChevronLeft, CreditCard, Building2, Smartphone,
  Lock, AlertCircle, MapPin,
} from 'lucide-react'
import { confirmBookingPayment, verifyBookingPayment } from '../../../../lib/actions/booking'
import BookingProgress from '../components/BookingProgress'

const PAYMENT_METHODS = [
  { id: 'card', icon: CreditCard, label: 'Debit / Credit Card', description: 'Visa, Mastercard, Verve' },
  { id: 'bank_transfer', icon: Building2, label: 'Bank Transfer', description: 'Direct transfer from your bank' },
  { id: 'ussd', icon: Smartphone, label: 'USSD', description: "Pay with your bank's USSD code" },
]

export default function PayClient({ booking }) {
  const router = useRouter()

  const [selectedMethod, setSelectedMethod] = useState('card')
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  async function handlePay() {
    setLoading(true)
    setSubmitError('')

    // Step 1 — mark the booking pending_payment and get the (placeholder)
    // gateway authorization URL. In production this is where the browser
    // would redirect to Paystack's hosted checkout.
    const confirmResult = await confirmBookingPayment(booking.id, selectedMethod)
    if ('error' in confirmResult) {
      setLoading(false)
      setSubmitError(confirmResult.error)
      return
    }

    // Step 2 — simulate the gateway round-trip. Paystack would redirect
    // back with a real transaction reference; we fabricate one here since
    // there is no live integration yet.
    await new Promise((resolve) => setTimeout(resolve, 1800))
    const simulatedReference = `SIMULATED-${Date.now()}`

    const verifyResult = await verifyBookingPayment(booking.id, simulatedReference)
    setLoading(false)

    if ('error' in verifyResult) {
      setSubmitError(verifyResult.error)
      return
    }

    router.push(`/booking/success?bookingId=${booking.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BookingProgress step={1} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/booking/confirm?roomId=${booking.room?.id ?? ''}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Confirmation
        </Link>

        {submitError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">

            <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <Lock className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-sm text-green-700 font-medium">
                Secured by Paystack · 256-bit SSL encryption · Your card details are never stored
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Select Payment Method</h2>
              <div className="flex flex-col gap-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon
                  const isSelected = selectedMethod === method.id
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected ? 'border-orange-400 bg-orange-50' : 'border-gray-100 hover:border-orange-200'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-orange-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-orange-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-orange-500' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isSelected ? 'text-orange-600' : 'text-gray-800'}`}>{method.label}</p>
                        <p className="text-xs text-gray-500">{method.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Phase 1 note: no live payment gateway is connected yet. Clicking "Pay" below simulates a
                successful transaction so the booking flow can be tested end-to-end against the database.
              </p>
            </div>

          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
                <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>

                <div className="flex items-start gap-3 mb-5 pb-5 border-b border-gray-100">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Room {booking.room?.number} — {booking.room?.type}</p>
                    <p className="text-xs text-gray-500">{booking.property?.name} · {booking.blockName}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {booking.property?.city}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Room price</span>
                    <span className="font-medium text-gray-800">₦{booking.roomPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Lease</span>
                    <span className="font-medium text-gray-800">{booking.leaseType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Move in</span>
                    <span className="font-medium text-gray-800">{booking.moveInDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service fee</span>
                    <span className="font-medium text-gray-800">₦{booking.serviceFee.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between font-bold text-base pt-3 border-t border-gray-100 mb-6">
                  <span className="text-gray-900">Total</span>
                  <span className="text-orange-500">₦{booking.totalAmount.toLocaleString()}</span>
                </div>

                <button
                  onClick={handlePay}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 active:scale-[0.98] text-white font-bold py-4 rounded-xl transition-all text-base"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Pay ₦{booking.totalAmount.toLocaleString()}
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-gray-500 mt-3">🔒 Funds held in escrow for 48 hours after payment</p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Your money goes into escrow immediately after payment.
                    The landlord does not receive it until 48 hours have passed without a dispute.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}