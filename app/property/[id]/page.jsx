// app/property/[id]/page.jsx
// Pulls real property + room data from the central data file
// Every room card now links to the correct room detail page

'use client'

import { useState } from 'react'
import { useSearchParams} from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck, MapPin, Building2, BedDouble,
  ChevronLeft, ArrowRight, AlertCircle,
} from 'lucide-react'
import { getPropertyById } from '../../lib/data'

const STATUS_STYLES = {
  Available:   'bg-green-100 text-green-700',
  Booked:      'bg-red-100 text-red-600',
  Maintenance: 'bg-gray-100 text-gray-500',
}

const STATUS_DOTS = {
  Available:   'bg-green-500',
  Booked:      'bg-red-500',
  Maintenance: 'bg-gray-400',
}

import { use } from 'react'

export default function PropertyPage({ params }) {

  // Next.js 16 — params is a Promise, must unwrap with React.use()
  const { id } = use(params)
  const property = getPropertyById(id)

  // Handle unknown property id in the URL
  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-bold text-gray-900">Property not found</p>
        <Link href="/search" className="text-orange-500 hover:underline">
          Back to Search
        </Link>
      </div>
    )
  }

  const [activeBlock, setActiveBlock]   = useState(property.blocks[0].id)
  const [selectedRoom, setSelectedRoom] = useState(null)

  const currentBlock = property.blocks.find((b) => b.id === activeBlock)

  // Derive stats from real room data
  const allRooms         = property.blocks.flatMap((b) => b.rooms)
  const totalAvailable   = allRooms.filter((r) => r.status === 'Available').length
  const totalBooked      = allRooms.filter((r) => r.status === 'Booked').length
  const totalMaintenance = allRooms.filter((r) => r.status === 'Maintenance').length

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Breadcrumb ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-orange-500">Home</Link>
            <span>/</span>
            <Link href="/search" className="hover:text-orange-500">Search</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{property.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Link
          href="/search"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Search
        </Link>

        {/* ── Property Header ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Property
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{property.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  {property.address}
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  {property.university}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs bg-blue-50 text-blue-600 font-medium px-3 py-1 rounded-full">
                  🚶 {property.distanceToGate} to gate
                </span>
                <span className="text-xs bg-blue-50 text-blue-600 font-medium px-3 py-1 rounded-full">
                  🏫 {property.distanceToFaculty} to faculty
                </span>
                <span className="text-xs bg-blue-50 text-blue-600 font-medium px-3 py-1 rounded-full">
                  🛒 {property.distanceToMarket} to market
                </span>
              </div>
            </div>

            {/* Landlord */}
            <div className="bg-gray-50 rounded-xl p-4 shrink-0 min-w-48">
              <p className="text-xs text-gray-400 mb-2">Property Owner</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-orange-500">
                    {property.landlord.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{property.landlord.name}</p>
                  {property.landlord.verified && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">{property.landlord.responseTime}</p>
            </div>
          </div>

          {/* Amenities */}
          <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-gray-100">
            {property.amenities.map((a) => (
              <span key={a} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">
                {a}
              </span>
            ))}
          </div>
        </div>

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalAvailable}</p>
            <p className="text-xs text-gray-500 mt-0.5">Available</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{totalBooked}</p>
            <p className="text-xs text-gray-500 mt-0.5">Booked</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">{totalMaintenance}</p>
            <p className="text-xs text-gray-500 mt-0.5">Maintenance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Block Tabs + Room Grid ── */}
          <div className="lg:col-span-2">

            {/* Block tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {property.blocks.map((block) => {
                const blockAvailable = block.rooms.filter((r) => r.status === 'Available').length
                return (
                  <button
                    key={block.id}
                    onClick={() => { setActiveBlock(block.id); setSelectedRoom(null) }}
                    className={`flex flex-col items-center px-5 py-3 rounded-xl border shrink-0 transition-all ${
                      activeBlock === block.id
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                    }`}
                  >
                    <span className="text-sm font-bold">{block.name}</span>
                    <span className={`text-xs mt-0.5 ${activeBlock === block.id ? 'text-orange-100' : 'text-green-500'}`}>
                      {blockAvailable} free
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-700">{currentBlock.name}</span>
              {' '}· {currentBlock.floor}
              {' '}· {currentBlock.rooms.length} rooms total
            </p>

            {/* Room Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentBlock.rooms.map((room) => {
                const isSelected = selectedRoom?.id === room.id
                const isBookable = room.status === 'Available'

                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(isSelected ? null : room)}
                    className={`text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                      isSelected
                        ? 'border-orange-400 bg-orange-50 shadow-md'
                        : 'border-gray-100 bg-white hover:border-orange-200 hover:shadow-sm'
                    } ${!isBookable ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {room.number}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{room.type}</p>
                          <p className="text-xs text-gray-400">{room.floor} Floor</p>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[room.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[room.status]}`} />
                        {room.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>{room.bathroom}</span>
                        <span>·</span>
                        <span>{room.furnished === 'Yes' ? 'Furnished' : 'Unfurnished'}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        ₦{room.price.toLocaleString()}
                        <span className="text-xs font-normal text-gray-400">/yr</span>
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {selectedRoom ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">

                  {/* Image placeholder */}
                  <div className="h-44 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
                    <Building2 className="w-10 h-10 text-gray-400" />
                    <span className={`absolute top-3 right-3 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[selectedRoom.status]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[selectedRoom.status]}`} />
                      {selectedRoom.status}
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">
                      Room {selectedRoom.number} — {selectedRoom.type}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {currentBlock.name} · {selectedRoom.floor} Floor · {property.name}
                    </p>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {[
                        { label: 'Type',       value: selectedRoom.type },
                        { label: 'Bathroom',   value: selectedRoom.bathroom },
                        { label: 'Furnished',  value: selectedRoom.furnished === 'Yes' ? 'Yes' : 'No' },
                        { label: 'Dimensions', value: selectedRoom.dimensions },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                          <p className="text-sm font-semibold text-gray-800">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Price */}
                    <div className="flex items-end justify-between mb-5">
                      <div>
                        <p className="text-xs text-gray-400">Annual rent</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ₦{selectedRoom.price.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 pb-1">
                        + 7% service fee at checkout
                      </p>
                    </div>

                    {/* CTA — links to the correct room detail page using real room id */}
                    {selectedRoom.status === 'Available' ? (
                      <Link
                        href={`/rooms/${selectedRoom.id}`}
                        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
                      >
                        View Full Details & Book
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 font-bold py-3.5 rounded-xl text-sm cursor-not-allowed"
                      >
                        {selectedRoom.status === 'Booked' ? 'Currently Booked' : 'Under Maintenance'}
                      </button>
                    )}

                    {selectedRoom.status === 'Available' && (
                      <div className="flex items-start gap-2 mt-3 bg-green-50 rounded-xl p-3">
                        <ShieldCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-green-700">
                          Escrow-protected. Your money is safe for 48 hours after booking.
                        </p>
                      </div>
                    )}

                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
                    <BedDouble className="w-7 h-7 text-orange-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Select a Room</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Click any room card to see its details here.
                  </p>
                  <div className="flex flex-col gap-2 w-full">
                    {Object.entries(STATUS_STYLES).map(([status, style]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${style}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[status]}`} />
                          {status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {status === 'Available'   && 'Can be booked'}
                          {status === 'Booked'      && 'Already taken'}
                          {status === 'Maintenance' && 'Not available'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}