'use client'
// app/saved/page.jsx
// Saved / Shortlisted Rooms — upgraded with:
// 1. Checkbox selection on hover for each room card
// 2. Fixed bottom compare bar appears when 2-3 rooms are selected
// 3. Full-screen comparison modal with side-by-side table
// 4. Color indicators for better/equal values

import { useState } from 'react'
import Link from 'next/link'
import {
  Heart, MapPin, Building2, X, ArrowRight,
  Search, ShieldCheck, CheckSquare, Square,
  BarChart2, ChevronDown, ChevronUp,
} from 'lucide-react'

// ── Mock saved rooms ──────────────────────────────────────────
const INITIAL_SAVED = [
  {
    id: 'room-a5', propertyId: 'prop-1', roomId: '1',
    title: 'Self-Contain Room — Block A, Room A05', property: 'Sunrise Hostel',
    university: 'University of Abuja', city: 'Abuja', price: 180000,
    type: 'Self-Contain', bathroom: 'En-suite', furnished: 'Yes',
    amenities: ['24hr Power', 'WiFi', 'Water'], status: 'Available', savedOn: 'March 20, 2026',
    distanceToGate: '5 mins', security: 'CCTV + 24hr Guard',
  },
  {
    id: 'room-b1', propertyId: 'prop-2', roomId: '2',
    title: 'Self-Contain Room — Block B, Room B01', property: 'Greenfield Lodge',
    university: 'UNILAG', city: 'Lagos', price: 200000,
    type: 'Self-Contain', bathroom: 'En-suite', furnished: 'Yes',
    amenities: ['24hr Power', 'WiFi', 'Parking'], status: 'Available', savedOn: 'March 22, 2026',
    distanceToGate: '3 mins', security: 'CCTV',
  },
  {
    id: 'room-c1', propertyId: 'prop-3', roomId: '3',
    title: 'Shared Room — Block C, Room C01', property: 'Campus View Hostel',
    university: 'UNN', city: 'Enugu', price: 90000,
    type: 'Shared', bathroom: 'Shared', furnished: 'No',
    amenities: ['Solar Power', 'WiFi', 'Water'], status: 'Available', savedOn: 'March 25, 2026',
    distanceToGate: '8 mins', security: 'Security Guard',
  },
]

// ── Comparison field config ───────────────────────────────────
const COMPARE_FIELDS = [
  { key: 'price',          label: 'Annual Rent',      format: v => `₦${v.toLocaleString()}`, better: 'lower' },
  { key: 'type',           label: 'Room Type',        format: v => v,                         better: null    },
  { key: 'bathroom',       label: 'Bathroom',         format: v => v,                         better: null    },
  { key: 'furnished',      label: 'Furnished',        format: v => v,                         better: null    },
  { key: 'distanceToGate', label: 'Distance to Gate', format: v => v,                         better: null    },
  { key: 'security',       label: 'Security',         format: v => v,                         better: null    },
]

// Get comparison color for a value in a row
function getCompareStyle(field, value, allValues) {
  if (!field.better) return ''
  const nums = allValues.map(v => parseInt(v) || 0)
  const thisNum = parseInt(value) || 0
  if (field.better === 'lower') {
    const best = Math.min(...nums)
    if (thisNum === best) return 'text-green-600 font-semibold bg-green-50'
    return 'text-gray-600'
  }
  return ''
}

// ── Compare Modal ─────────────────────────────────────────────
function CompareModal({ rooms, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="compare-modal bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-gray-900 text-lg">Compare Rooms</h2>
            <span className="text-sm text-gray-400">({rooms.length} rooms)</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                  Feature
                </th>
                {rooms.map(room => (
                  <th key={room.id} className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-orange-500" />
                      </div>
                      <p className="text-xs font-bold text-gray-900 leading-tight">{room.property}</p>
                      <p className="text-xs text-gray-500">{room.city}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_FIELDS.map((field, rowIdx) => {
                const allValues = rooms.map(r => r[field.key])
                return (
                  <tr key={field.key} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-100">
                      {field.label}
                    </td>
                    {rooms.map(room => {
                      const value = room[field.key]
                      const style = getCompareStyle(field, value, allValues)
                      return (
                        <td
                          key={room.id}
                          className={`px-4 py-3 text-center text-sm rounded ${style}`}
                        >
                          {field.format(value)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}

              {/* Amenities row */}
              <tr className="bg-white">
                <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-100">
                  Amenities
                </td>
                {rooms.map(room => (
                  <td key={room.id} className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {room.amenities.map(a => (
                        <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {a}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer — Book CTAs */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <div className="grid gap-3" style={{ gridTemplateColumns: `auto repeat(${rooms.length}, 1fr)` }}>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider self-center">
              Action
            </div>
            {rooms.map(room => (
              <Link
                key={room.id}
                href={`/rooms/${room.roomId}`}
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                Book Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ))}
          </div>
          <p className="text-xs text-center text-gray-400 mt-2">
            Green values indicate the better option for that feature
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function SavedRoomsPage() {
  const [saved, setSaved]           = useState(INITIAL_SAVED)
  const [selected, setSelected]     = useState([])  // array of room ids
  const [showCompare, setShowCompare] = useState(false)

  function removeRoom(id) {
    setSaved(prev => prev.filter(r => r.id !== id))
    setSelected(prev => prev.filter(s => s !== id))
  }

  function toggleSelect(id) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id)
      if (prev.length >= 3)  return prev   // max 3
      return [...prev, id]
    })
  }

  const selectedRooms = saved.filter(r => selected.includes(r.id))

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Compare modal */}
      {showCompare && (
        <CompareModal
          rooms={selectedRooms}
          onClose={() => setShowCompare(false)}
        />
      )}

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
                {saved.length > 1 && (
                  <span className="ml-2 text-gray-400">
                    · Select up to 3 to compare
                  </span>
                )}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">

        {saved.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {saved.map(room => {
              const isSelected = selected.includes(room.id)
              const isDisabled = !isSelected && selected.length >= 3

              return (
                <div
                  key={room.id}
                  className={`bg-white rounded-2xl border overflow-hidden flex flex-col group shadow-sm transition-all duration-200 ${
                    isSelected
                      ? 'border-orange-400 shadow-md'
                      : 'border-gray-100 hover:shadow-md'
                  }`}
                >
                  {/* Image + checkbox overlay */}
                  <div className="relative h-44 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-gray-400" />

                    {/* Select checkbox — always visible when selected, on hover otherwise */}
                    <button
                      onClick={() => toggleSelect(room.id)}
                      disabled={isDisabled}
                      className={`absolute top-3 left-3 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-orange-500 opacity-100'
                          : isDisabled
                          ? 'bg-gray-200 opacity-50 cursor-not-allowed'
                          : 'bg-white/80 opacity-0 group-hover:opacity-100 hover:bg-white'
                      }`}
                      aria-label={isSelected ? 'Deselect for comparison' : 'Select for comparison'}
                    >
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-white" />
                        : <Square className="w-4 h-4 text-gray-500" />
                      }
                    </button>

                    {/* Remove button */}
                    <button
                      onClick={() => removeRoom(room.id)}
                      className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors text-gray-500 opacity-0 group-hover:opacity-100"
                      title="Remove from saved"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Verified badge */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs font-medium text-green-600">Verified</span>
                    </div>

                    {/* Status */}
                    <span className="absolute bottom-3 right-3 text-xs font-semibold bg-green-500 text-white px-2.5 py-1 rounded-full">
                      {room.status}
                    </span>

                    {/* Selection indicator ring */}
                    {isSelected && (
                      <div className="absolute inset-0 border-2 border-orange-400 rounded-t-2xl pointer-events-none" />
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1.5">
                      <MapPin className="w-3 h-3" />
                      {room.university} · {room.city}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-0.5 text-sm line-clamp-2">{room.title}</h3>
                    <p className="text-xs text-gray-500 mb-3">{room.property}</p>

                    <div className="flex gap-3 text-xs text-gray-500 mb-3">
                      <span className="bg-orange-50 text-orange-600 font-medium px-2 py-1 rounded-full">{room.type}</span>
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{room.bathroom}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {room.amenities.map(a => (
                        <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a}</span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mb-4">Saved on {room.savedOn}</p>

                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-gray-900">₦{room.price.toLocaleString()}</span>
                        <span className="text-xs text-gray-400"> /yr</span>
                      </div>
                      <Link
                        href={`/rooms/${room.roomId}`}
                        className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                      >
                        Book Now <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-5">
              <Heart className="w-10 h-10 text-red-300" />
            </div>
            <h3 className="font-bold text-gray-900 text-xl mb-2">No Saved Rooms</h3>
            <p className="text-gray-500 text-sm mb-8 max-w-xs">
              When you find rooms you like, save them here to compare later.
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

      {/* ── Fixed compare bar — appears when 2-3 rooms are selected ── */}
      {selected.length >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-2xl px-4 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {selected.length} rooms selected
                </p>
                <p className="text-xs text-gray-500">
                  {selected.length < 3
                    ? `Select ${3 - selected.length} more to compare up to 3`
                    : 'Maximum selection reached'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelected([])}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Clear
              </button>
              <button
                onClick={() => setShowCompare(true)}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
              >
                <BarChart2 className="w-4 h-4" />
                Compare {selected.length} Rooms
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
