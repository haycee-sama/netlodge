// app/booking/pay/page.jsx
// Payment page — /booking/pay
// Student selects payment method and completes payment
// All booking info comes from URL params passed by the confirm page

'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ShieldCheck,
  ChevronLeft,
  CreditCard,
  Building2,
  Smartphone,
  CheckCircle,
  Lock,
  AlertCircle,
  ArrowRight,
  MapPin,
} from 'lucide-react'
import { getRoomById, SERVICE_FEE_RATE } from '../../lib/data'

// ── Payment method config ─────────────────────────────────────
const PAYMENT_METHODS = [
  {
    id:          'card',
    icon:        CreditCard,
    label:       'Debit / Credit Card',
    description: 'Visa, Mastercard, Verve',
  },
  {
    id:          'transfer',
    icon:        Building2,
    label:       'Bank Transfer',
    description: 'Direct transfer from your bank',
  },
  {
    id:          'ussd',
    icon:        Smartphone,
    label:       'USSD',
    description: 'Pay with your bank\'s USSD code',
  },
]

// ── Format date string for display ───────────────────────────
function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function PaymentInner() {

  const searchParams = useSearchParams()
  const router       = useRouter()

  const roomId    = searchParams.get('roomId')
  const leaseType = searchParams.get('lease') || '1 Year'
  const moveIn    = searchParams.get('moveIn') || ''

  const result = getRoomById(roomId)

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-center px-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-bold text-gray-900">Booking session expired</h2>
        <p className="text-gray-500 text-sm">Please start your booking again.</p>
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

  // Payment form state
  const [selectedMethod, setSelectedMethod] = useState('card')
  const [loading, setLoading]               = useState(false)

  // Card form fields
  const [card, setCard] = useState({
    number:  '',
    name:    '',
    expiry:  '',
    cvv:     '',
  })
  const [cardErrors, setCardErrors] = useState({})

  // Format card number with spaces every 4 digits
  function formatCardNumber(value) {
    return value
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(.{4})/g, '$1 ')
      .trim()
  }

  // Format expiry as MM/YY
  function formatExpiry(value) {
    const clean = value.replace(/\D/g, '').slice(0, 4)
    if (clean.length >= 2) {
      return clean.slice(0, 2) + '/' + clean.slice(2)
    }
    return clean
  }

  function handleCardChange(e) {
    const { name, value } = e.target
    let formatted = value

    if (name === 'number') formatted = formatCardNumber(value)
    if (name === 'expiry') formatted = formatExpiry(value)
    if (name === 'cvv')    formatted = value.replace(/\D/g, '').slice(0, 3)

    setCard((prev) => ({ ...prev, [name]: formatted }))
    if (cardErrors[name]) setCardErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function validateCard() {
    const e = {}
    if (!card.number || card.number.replace(/\s/g, '').length < 16)
      e.number = 'Enter a valid 16-digit card number'
    if (!card.name.trim())
      e.name   = 'Enter the name on your card'
    if (!card.expiry || card.expiry.length < 5)
      e.expiry = 'Enter a valid expiry date'
    if (!card.cvv || card.cvv.length < 3)
      e.cvv    = 'Enter your 3-digit CVV'
    return e
  }

  async function handlePay() {
    // Validate card fields if card payment is selected
    if (selectedMethod === 'card') {
      const errors = validateCard()
      if (Object.keys(errors).length > 0) {
        setCardErrors(errors)
        return
      }
    }

    setLoading(true)

    // Simulate payment processing
    // In the real app: initiate Paystack payment here
    await new Promise((resolve) => setTimeout(resolve, 2500))

    // Redirect to success page with booking info
    router.push(
      `/booking/success?roomId=${roomId}&lease=${encodeURIComponent(leaseType)}&moveIn=${moveIn}`
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Progress Bar ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2">
            {['Review & Confirm', 'Payment', 'Booking Complete'].map((step, index) => {
              const isActive   = index === 1
              const isComplete = index < 1
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
                      {isComplete
                        ? <CheckCircle className="w-4 h-4" />
                        : index + 1
                      }
                    </div>
                    <span className={`text-sm font-medium hidden sm:block ${
                      isActive ? 'text-orange-500' : isComplete ? 'text-green-600' : 'text-gray-400'
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
          href={`/booking/confirm?roomId=${roomId}&lease=${encodeURIComponent(leaseType)}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Confirmation
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ════════════════════════════════
              LEFT — Payment Form
          ════════════════════════════════ */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* ── Security notice ── */}
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <Lock className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-sm text-green-700 font-medium">
                Secured by Paystack · 256-bit SSL encryption · Your card details are never stored
              </p>
            </div>

            {/* ── Payment Method Selection ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Select Payment Method</h2>

              <div className="flex flex-col gap-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon      = method.icon
                  const isSelected = selectedMethod === method.id
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-100 hover:border-orange-200'
                      }`}
                    >
                      {/* Radio indicator */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-orange-500' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        )}
                      </div>

                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-orange-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-orange-500' : 'text-gray-400'}`} />
                      </div>

                      <div>
                        <p className={`text-sm font-semibold ${isSelected ? 'text-orange-600' : 'text-gray-800'}`}>
                          {method.label}
                        </p>
                        <p className="text-xs text-gray-400">{method.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Card Form — only shown when card is selected ── */}
            {selectedMethod === 'card' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-5">Card Details</h2>

                <div className="flex flex-col gap-4">

                  {/* Card number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Card Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="number"
                      value={card.number}
                      onChange={handleCardChange}
                      placeholder="0000 0000 0000 0000"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-mono text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                        cardErrors.number
                          ? 'border-red-300 focus:ring-red-100'
                          : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
                      }`}
                    />
                    {cardErrors.number && (
                      <p className="text-xs text-red-500 mt-1">{cardErrors.number}</p>
                    )}
                  </div>

                  {/* Name on card */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Name on Card <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={card.name}
                      onChange={handleCardChange}
                      placeholder="As it appears on your card"
                      className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                        cardErrors.name
                          ? 'border-red-300 focus:ring-red-100'
                          : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
                      }`}
                    />
                    {cardErrors.name && (
                      <p className="text-xs text-red-500 mt-1">{cardErrors.name}</p>
                    )}
                  </div>

                  {/* Expiry + CVV row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Expiry Date <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="expiry"
                        value={card.expiry}
                        onChange={handleCardChange}
                        placeholder="MM/YY"
                        className={`w-full px-4 py-3 rounded-xl border text-sm font-mono text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                          cardErrors.expiry
                            ? 'border-red-300 focus:ring-red-100'
                            : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
                        }`}
                      />
                      {cardErrors.expiry && (
                        <p className="text-xs text-red-500 mt-1">{cardErrors.expiry}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        CVV <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="password"
                        name="cvv"
                        value={card.cvv}
                        onChange={handleCardChange}
                        placeholder="•••"
                        className={`w-full px-4 py-3 rounded-xl border text-sm font-mono text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                          cardErrors.cvv
                            ? 'border-red-300 focus:ring-red-100'
                            : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
                        }`}
                      />
                      {cardErrors.cvv && (
                        <p className="text-xs text-red-500 mt-1">{cardErrors.cvv}</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ── Bank Transfer Instructions ── */}
            {selectedMethod === 'transfer' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-4">Bank Transfer Details</h2>
                <div className="bg-gray-50 rounded-xl p-5 flex flex-col gap-3">
                  {[
                    { label: 'Bank Name',      value: 'Netlodge Escrow — Guaranty Trust Bank' },
                    { label: 'Account Number', value: '0123456789' },
                    { label: 'Account Name',   value: 'Netlodge Housing Ltd' },
                    { label: 'Amount',         value: `₦${total.toLocaleString()}` },
                    { label: 'Reference',      value: `NL-${roomId?.slice(-6).toUpperCase()}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold text-gray-800 font-mono text-right">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Use the exact reference number when making the transfer.
                    Your booking will be confirmed once payment is verified — usually within 30 minutes.
                  </p>
                </div>
              </div>
            )}

            {/* ── USSD Instructions ── */}
            {selectedMethod === 'ussd' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-4">USSD Payment</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Dial your bank's USSD code and follow the prompts to pay{' '}
                  <strong>₦{total.toLocaleString()}</strong> to Netlodge.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { bank: 'GTBank',    code: '*737#' },
                    { bank: 'Access',    code: '*901#' },
                    { bank: 'Zenith',    code: '*966#' },
                    { bank: 'First Bank',code: '*894#' },
                    { bank: 'UBA',       code: '*919#' },
                    { bank: 'Sterling',  code: '*822#' },
                  ].map(({ bank, code }) => (
                    <div key={bank} className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center">
                      <span className="text-sm text-gray-700">{bank}</span>
                      <span className="text-sm font-mono font-bold text-orange-500">{code}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ════════════════════════════════
              RIGHT — Order Summary
          ════════════════════════════════ */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 flex flex-col gap-4">

              {/* Order summary card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
                <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>

                {/* Room info */}
                <div className="flex items-start gap-3 mb-5 pb-5 border-b border-gray-100">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Room {room.number} — {room.type}
                    </p>
                    <p className="text-xs text-gray-500">{property.name} · {block.name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {property.city}
                    </div>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Room price</span>
                    <span className="font-medium text-gray-800">₦{room.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Lease</span>
                    <span className="font-medium text-gray-800">{leaseType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Move in</span>
                    <span className="font-medium text-gray-800">{formatDate(moveIn)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service fee</span>
                    <span className="font-medium text-gray-800">₦{serviceFee.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between font-bold text-base pt-3 border-t border-gray-100 mb-6">
                  <span className="text-gray-900">Total</span>
                  <span className="text-orange-500">₦{total.toLocaleString()}</span>
                </div>

                {/* Pay button */}
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
                      Pay ₦{total.toLocaleString()}
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400 mt-3">
                  🔒 Funds held in escrow for 48 hours after payment
                </p>
              </div>

              {/* Escrow reminder */}
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
function PayLoading() {
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

export default function PaymentPage() {
  return (
    <Suspense fallback={<PayLoading />}>
      <PaymentInner />
    </Suspense>
  )
}