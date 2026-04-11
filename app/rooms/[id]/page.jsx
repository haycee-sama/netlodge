// app/rooms/[id]/page.jsx
// Pulls the REAL room from the central data file using the room id in the URL
// The room id comes from the property page when a student clicks View Full Details

'use client'

import { useState } from 'react'
import { useSearchParams} from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck, MapPin, Wifi, Zap, Droplets,
  ChevronLeft, Building2, Lock, CheckCircle,
  ArrowRight, AlertCircle,
} from 'lucide-react'
import { getRoomById, SERVICE_FEE_RATE } from '../../lib/data'

const AMENITY_ICONS = {
  power:    Zap,
  water:    Droplets,
  internet: Wifi,
  security: Lock,
  extras:   CheckCircle,
}

const AMENITY_LABELS = {
  power:    '⚡ Power',
  water:    '💧 Water',
  internet: '📶 Internet',
  security: '🔒 Security',
  extras:   '✨ Extras',
}

// ── Sub-components ────────────────────────────────────────────

function AmenityChip({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
      <Icon className="w-4 h-4 text-orange-500 shrink-0" />
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
import { use } from 'react'

export default function RoomDetailPage({ params }) {

  // Unwrap params — required in Next.js 16+
  const { id } = use(params)
  const result = getRoomById(id)

  // Handle room not found
  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-bold text-gray-900">Room not found</p>
        <Link href="/search" className="text-orange-500 hover:underline">
          Back to Search
        </Link>
      </div>
    )
  }

  const { room, block, property } = result

  const serviceFee   = Math.round(room.price * SERVICE_FEE_RATE)
  const total        = room.price + serviceFee

  const LEASE_OPTIONS = ['1 Year', 'Per Semester', 'Half Year']

  const [selectedLease, setSelectedLease]   = useState('1 Year')
  const [showEscrowInfo, setShowEscrowInfo] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Breadcrumb ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <Link href="/" className="hover:text-orange-500">Home</Link>
            <span>/</span>
            <Link href="/search" className="hover:text-orange-500">Search</Link>
            <span>/</span>
            {/* Links back to the correct property page */}
            <Link href={`/property/${property.id}`} className="hover:text-orange-500">
              {property.name}
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              Room {room.number}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Back to property page — not just search */}
        <Link
          href={`/property/${property.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {property.name}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left — Room Info ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Photo Gallery */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1 h-64 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center relative overflow-hidden">
                <Building2 className="w-16 h-16 text-gray-400" />
                <span className="absolute bottom-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                  Photo 1 of 5
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[2, 3, 4, 5].map((n) => (
                  <div key={n} className="h-[118px] bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center relative">
                    <Building2 className="w-8 h-8 text-gray-400" />
                    <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {n}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Room Header */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Listing
                </div>
                <span className="text-xs font-semibold bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full">
                  {room.type}
                </span>
              </div>

              {/* Title uses real data */}
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Room {room.number} — {room.type} · {block.name}
              </h1>

              {/* Property link goes to the correct property */}
              <Link
                href={`/property/${property.id}`}
                className="text-orange-500 font-medium text-sm hover:underline"
              >
                {property.name}
              </Link>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  {property.address}
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  {property.university}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-xs bg-blue-50 text-blue-600 font-medium px-3 py-1 rounded-full">
                  🚶 {property.distanceToGate} to gate
                </span>
                <span className="text-xs bg-blue-50 text-blue-600 font-medium px-3 py-1 rounded-full">
                  🏫 {property.distanceToFaculty} to faculty
                </span>
              </div>
            </div>

            {/* Room Details Grid */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Room Details</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <DetailRow label="Room Number"  value={room.number} />
                <DetailRow label="Room Type"    value={room.type} />
                <DetailRow label="Floor"        value={`${room.floor} Floor`} />
                <DetailRow label="Dimensions"   value={room.dimensions} />
                <DetailRow label="Bathroom"     value={room.bathroom} />
                <DetailRow label="Furnished"    value={room.furnished === 'Yes' ? 'Yes' : 'No'} />
              </div>
            </div>

            {/* Amenities — from real room data */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-5">Amenities</h2>
              {Object.entries(room.amenities).map(([category, items]) => (
                <div key={category} className="mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    {AMENITY_LABELS[category]}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map((item) => {
                      const Icon = AMENITY_ICONS[category]
                      return <AmenityChip key={item} icon={Icon} label={item} />
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* House Rules — from real property data */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">House Rules</h2>
              <ul className="flex flex-col gap-3">
                {property.rules.map((rule) => (
                  <li key={rule} className="flex items-start gap-3 text-sm text-gray-600">
                    <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* Landlord — from real property data */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">About the Landlord</h2>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-orange-500">
                    {property.landlord.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900">{property.landlord.name}</p>
                    {property.landlord.verified && (
                      <div className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-1">{property.landlord.responseTime}</p>
                  <p className="text-sm text-gray-500">
                    Manages {property.landlord.propertiesManaged} properties on Netlodge
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Landlord contact details are only revealed after a successful booking payment.
                </p>
              </div>
            </div>

          </div>

          {/* ── Right — Sticky Booking Card ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 flex flex-col gap-4">

              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">

                <div className="mb-5">
                  <span className="text-3xl font-bold text-gray-900">
                    ₦{room.price.toLocaleString()}
                  </span>
                  <span className="text-gray-400 text-sm"> / year</span>
                </div>

                {/* Status warning if not available */}
                {room.status !== 'Available' && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
                    <p className="text-sm text-red-600 font-medium text-center">
                      This room is currently {room.status.toLowerCase()}
                    </p>
                  </div>
                )}

                {/* Lease options */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lease Duration
                  </label>
                  <div className="flex flex-col gap-2">
                    {LEASE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => setSelectedLease(option)}
                        className={`text-sm font-medium px-4 py-2.5 rounded-xl border transition-all text-left ${
                          selectedLease === option
                            ? 'bg-orange-50 border-orange-400 text-orange-600'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="flex flex-col gap-2 py-4 border-t border-b border-gray-100 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Room price</span>
                    <span className="font-medium text-gray-800">₦{room.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service fee (7%)</span>
                    <span className="font-medium text-gray-800">₦{serviceFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1">
                    <span className="text-gray-900">Total</span>
                    <span className="text-orange-500">₦{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Book button — passes room id in the URL to the confirm page */}
                {room.status === 'Available' ? (
                  <Link
                    href={`/booking/confirm?roomId=${room.id}&lease=${encodeURIComponent(selectedLease)}`}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-colors text-base"
                  >
                    Book This Room
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-100 text-gray-400 font-bold py-4 rounded-xl cursor-not-allowed text-base"
                  >
                    {room.status === 'Booked' ? 'Currently Booked' : 'Under Maintenance'}
                  </button>
                )}

                <button
                  onClick={() => setShowEscrowInfo(!showEscrowInfo)}
                  className="w-full text-center text-xs text-gray-400 hover:text-orange-500 mt-3 transition-colors"
                >
                  🔒 How is my payment protected?
                </button>

                {showEscrowInfo && (
                  <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Your payment is held in escrow for 48 hours after booking.
                      If the room does not match the listing you can file a dispute
                      and receive a full refund.
                    </p>
                  </div>
                )}

              </div>

              {/* Safety card */}
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-800 mb-1">Safe to Book</p>
                    <ul className="text-xs text-green-700 flex flex-col gap-1">
                      <li>✓ Landlord identity verified</li>
                      <li>✓ Property documents checked</li>
                      <li>✓ Escrow payment protection</li>
                      <li>✓ 48-hour dispute window</li>
                    </ul>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-gray-400">
                Something look wrong?{' '}
                <Link href="/contact" className="text-orange-500 hover:underline">
                  Report this listing
                </Link>
              </p>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}