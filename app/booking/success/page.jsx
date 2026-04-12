'use client'
// app/booking/success/page.jsx
// Booking Success — upgraded with:
// 1. Animated SVG checkmark that draws itself on load
// 2. Confetti burst (pure CSS) after checkmark completes
// 3. Page content fades in after animation completes
// 4. All original content and flow preserved

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ShieldCheck, MapPin, Building2, Calendar,
  Clock, Download, AlertCircle, ArrowRight, Phone, Mail,
} from 'lucide-react'
import { getRoomById, SERVICE_FEE_RATE } from '../../lib/data'

// ── Animated checkmark SVG ────────────────────────────────────
function AnimatedCheckmark({ onComplete }) {
  useEffect(() => {
    // Content fades in after 1 second (checkmark finishes at ~0.8s)
    const timer = setTimeout(onComplete, 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative flex items-center justify-center w-24 h-24 mx-auto mb-5">
      <svg
        width="96" height="96"
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer circle — draws in first */}
        <circle
          cx="48" cy="48" r="44"
          stroke="#22c55e"
          strokeWidth="3"
          className="check-circle"
        />
        {/* Checkmark path — draws in after circle */}
        <path
          d="M28 48 L42 62 L68 34"
          stroke="#22c55e"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="check-path"
          style={{ animationDelay: '0.5s' }}
        />
      </svg>
    </div>
  )
}

// ── Confetti burst — pure CSS particles ──────────────────────
const CONFETTI_COLORS = [
  '#f97316', '#22c55e', '#3b82f6', '#f59e0b',
  '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444',
]

function ConfettiBurst() {
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id:      i,
    color:   CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left:    `${20 + Math.random() * 60}%`,
    top:     `${10 + Math.random() * 30}%`,
    delay:   `${Math.random() * 0.4}s`,
    duration:`${0.7 + Math.random() * 0.5}s`,
    rotate:  `rotate(${Math.random() * 360}deg)`,
    shape:   i % 3 === 0 ? 'rounded-full' : i % 3 === 1 ? 'rounded-sm' : '',
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className={`confetti-particle ${p.shape}`}
          style={{
            left:             p.left,
            top:              p.top,
            backgroundColor:  p.color,
            '--delay':        p.delay,
            '--duration':     p.duration,
            transform:        p.rotate,
          }}
        />
      ))}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────
function generateBookingRef(roomId) {
  return `NL-2026-${(roomId?.slice(-6) || 'XXXXXX').toUpperCase()}`
}
function formatDate(d) {
  if (!d) return 'Not specified'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
function getLeaseEnd(moveInDate, leaseType) {
  if (!moveInDate) return ''
  const date = new Date(moveInDate)
  if (leaseType === '1 Year')       date.setFullYear(date.getFullYear() + 1)
  if (leaseType === 'Half Year')    date.setMonth(date.getMonth() + 6)
  if (leaseType === 'Per Semester') date.setMonth(date.getMonth() + 5)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────
function BookingSuccessInner() {
  const searchParams = useSearchParams()
  const roomId    = searchParams.get('roomId')
  const leaseType = searchParams.get('lease') || '1 Year'
  const moveIn    = searchParams.get('moveIn') || ''
  const result    = getRoomById(roomId)

  // Content fades in after the checkmark animation completes
  const [contentVisible, setContentVisible] = useState(false)
  const [showConfetti,   setShowConfetti]   = useState(false)

  function handleCheckmarkDone() {
    setShowConfetti(true)
    setTimeout(() => {
      setContentVisible(true)
      setShowConfetti(false)
    }, 600)
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
          <AnimatedCheckmark onComplete={() => setContentVisible(true)} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Successful!</h1>
        <p className="text-gray-500">Check your email for your booking confirmation.</p>
        <Link href="/dashboard" className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors">
          Go to Dashboard
        </Link>
      </div>
    )
  }

  const { room, block, property } = result
  const serviceFee = Math.round(room.price * SERVICE_FEE_RATE)
  const total      = room.price + serviceFee
  const bookingRef = generateBookingRef(roomId)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Success Hero — with animated checkmark and confetti ── */}
      <div className="bg-green-500 text-white py-14 text-center relative overflow-hidden">
        {/* Confetti burst anchored to hero */}
        {showConfetti && <ConfettiBurst />}

        <AnimatedCheckmark onComplete={handleCheckmarkDone} />

        <div
          className="transition-all duration-500"
          style={{ opacity: contentVisible ? 1 : 0, transform: contentVisible ? 'translateY(0)' : 'translateY(12px)' }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Booking Confirmed!</h1>
          <p className="text-green-100 text-lg mb-4">
            Your room has been successfully booked and your payment is in escrow.
          </p>
          <div className="inline-flex items-center gap-3 bg-white/20 border border-white/30 rounded-xl px-5 py-3">
            <span className="text-sm text-green-100">Booking Reference</span>
            <span className="font-mono font-bold text-white text-lg">{bookingRef}</span>
          </div>
        </div>
      </div>

      {/* ── Page content — fades in after animation ── */}
      <div
        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-6 transition-all duration-500"
        style={{ opacity: contentVisible ? 1 : 0, transform: contentVisible ? 'translateY(0)' : 'translateY(16px)' }}
      >

        {/* Booking Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-5">Booking Summary</h2>
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900">Room {room.number} — {room.type}</h3>
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Move-In Date', value: formatDate(moveIn) },
              { label: 'Lease Ends',   value: getLeaseEnd(moveIn, leaseType) },
              { label: 'Lease Type',   value: leaseType },
              { label: 'Room Type',    value: room.type },
              { label: 'Bathroom',     value: room.bathroom },
              { label: 'Payment',      value: 'Paid' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{value}</p>
              </div>
            ))}
          </div>

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

        {/* Landlord Contact */}
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
              <span className="text-xl font-bold text-orange-500">{property.landlord.name.charAt(0)}</span>
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
                  +234 801 234 5678
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-orange-500" />
                  landlord@netlodge.ng
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

        {/* Escrow Notice */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-1">48-Hour Escrow Window is Now Open</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                Your payment of <strong>₦{total.toLocaleString()}</strong> is held in escrow.
                Visit the room within 48 hours. If it does not match the listing, file a dispute
                before the window closes.
              </p>
              <Link href="/bookings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline mt-3">
                Go to My Bookings <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-colors"
          >
            Go to My Dashboard <ArrowRight className="w-5 h-5" />
          </Link>
          <button className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 font-bold py-4 rounded-xl transition-colors">
            <Download className="w-5 h-5" /> Download Receipt
          </button>
        </div>

        <p className="text-center text-sm text-gray-400">
          Need help?{' '}
          <Link href="/contact" className="text-orange-500 hover:underline font-medium">Contact Support</Link>
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
