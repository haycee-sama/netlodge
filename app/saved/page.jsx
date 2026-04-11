// app/saved/page.jsx
// Saved / Shortlisted Rooms — /saved
// Shows all rooms the student has saved
// Student can remove rooms or go directly to book them

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Heart,
  MapPin,
  Building2,
  X,
  ArrowRight,
  Search,
  ShieldCheck,
} from 'lucide-react'

// ── Mock saved rooms data ─────────────────────────────────────
const INITIAL_SAVED = [
  {
    id:         'room-a5',
    propertyId: 'prop-1',
    roomId:     '1',
    title:      'Self-Contain Room — Block A, Room A05',
    property:   'Sunrise Hostel',
    university: 'University of Abuja',
    city:       'Abuja',
    price:      180000,
    type:       'Self-Contain',
    bathroom:   'En-suite',
    amenities:  ['24hr Power', 'WiFi', 'Water'],
    status:     'Available',
    savedOn:    'March 20, 2026',
  },
  {
    id:         'room-b1',
    propertyId: 'prop-2',
    roomId:     '2',
    title:      'Self-Contain Room — Block B, Room B01',
    property:   'Greenfield Lodge',
    university: 'UNILAG',
    city:       'Lagos',
    price:      200000,
    type:       'Self-Contain',
    bathroom:   'En-suite',
    amenities:  ['24hr Power', 'WiFi', 'Parking'],
    status:     'Available',
    savedOn:    'March 22, 2026',
  },
  {
    id:         'room-c1',
    propertyId: 'prop-3',
    roomId:     '3',
    title:      'Shared Room — Block C, Room C01',
    property:   'Campus View Hostel',
    university: 'UNN',
    city:       'Enugu',
    price:      90000,
    type:       'Shared',
    bathroom:   'Shared',
    amenities:  ['Solar Power', 'WiFi', 'Water'],
    status:     'Available',
    savedOn:    'March 25, 2026',
  },
]

export default function SavedRoomsPage() {

  const [saved, setSaved] = useState(INITIAL_SAVED)

  // Remove a room from saved list
  function removeRoom(id) {
    setSaved((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-400" />
                Saved Rooms
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {saved.length} room{saved.length !== 1 ? 's' : ''} saved
              </p>
            </div>
            <Link
              href="/search"
              className="flex items-center gap-2 text-sm font-semibold text-orange-500 hover:underline"
            >
              <Search className="w-4 h-4" />
              Browse more rooms
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {saved.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {saved.map((room) => (
              <div
                key={room.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
              >
                {/* Image placeholder */}
                <div className="relative h-44 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-gray-400" />

                  {/* Remove button */}
                  <button
                    onClick={() => removeRoom(room.id)}
                    className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors text-gray-500"
                    title="Remove from saved"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Verified badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs font-medium text-green-600">Verified</span>
                  </div>

                  {/* Status */}
                  <span className="absolute bottom-3 left-3 text-xs font-semibold bg-green-500 text-white px-2.5 py-1 rounded-full">
                    {room.status}
                  </span>
                </div>

                {/* Card body */}
                <div className="p-5 flex flex-col flex-1">

                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-1.5">
                    <MapPin className="w-3 h-3" />
                    {room.university} · {room.city}
                  </div>

                  <h3 className="font-bold text-gray-900 mb-0.5 text-sm line-clamp-2">
                    {room.title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">{room.property}</p>

                  {/* Details row */}
                  <div className="flex gap-3 text-xs text-gray-500 mb-3">
                    <span className="bg-orange-50 text-orange-600 font-medium px-2 py-1 rounded-full">
                      {room.type}
                    </span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {room.bathroom}
                    </span>
                  </div>

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {room.amenities.map((a) => (
                      <span
                        key={a}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                      >
                        {a}
                      </span>
                    ))}
                  </div>

                  {/* Saved date */}
                  <p className="text-xs text-gray-400 mb-4">
                    Saved on {room.savedOn}
                  </p>

                  {/* Price + CTA */}
                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-gray-900">
                        ₦{room.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400"> /yr</span>
                    </div>
                    <Link
                      href={`/rooms/${room.roomId}`}
                      className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                    >
                      Book Now
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-5">
              <Heart className="w-10 h-10 text-red-300" />
            </div>
            <h3 className="font-bold text-gray-900 text-xl mb-2">
              No Saved Rooms
            </h3>
            <p className="text-gray-500 text-sm mb-8 max-w-xs">
              When you find rooms you like on the search page, save them here to compare later.
            </p>
            <Link
              href="/search"
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl transition-colors"
            >
              <Search className="w-5 h-5" />
              Browse Verified Rooms
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
