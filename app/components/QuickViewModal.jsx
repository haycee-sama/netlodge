// app/components/QuickViewModal.jsx
// Quick-view modal that slides up when a user clicks "Quick View"
// on a property card in the search results. Shows top room types,
// key amenities, and a CTA to the full property page.
//
// Props:
//   property — property summary object from getPropertySummaries()
//   onClose  — function to close the modal

'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  X,
  ShieldCheck,
  MapPin,
  Building2,
  BedDouble,
  ArrowRight,
  Wifi,
  Zap,
  Droplets,
  Lock,
} from 'lucide-react'

// Map amenity strings to icons
function AmenityIcon({ label }) {
  const lower = label.toLowerCase()
  if (lower.includes('wifi') || lower.includes('internet')) return <Wifi className="w-3.5 h-3.5" />
  if (lower.includes('power') || lower.includes('electric') || lower.includes('generator') || lower.includes('solar')) return <Zap className="w-3.5 h-3.5" />
  if (lower.includes('water') || lower.includes('borehole')) return <Droplets className="w-3.5 h-3.5" />
  if (lower.includes('security') || lower.includes('cctv') || lower.includes('gated')) return <Lock className="w-3.5 h-3.5" />
  return <ShieldCheck className="w-3.5 h-3.5" />
}

// Room type price range mock (in real app comes from actual data)
const ROOM_TYPE_COLORS = {
  'Self-Contain': 'bg-orange-50 text-orange-700',
  'Single':       'bg-blue-50 text-blue-700',
  'Shared':       'bg-green-50 text-green-700',
}

export default function QuickViewModal({ property, onClose }) {
  const modalRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Close on backdrop click
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="modal-content bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Modal header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Property
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{property.name}</h2>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              {property.university} · {property.city}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close quick view"
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Property image placeholder */}
        <div className="h-44 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
          <Building2 className="w-12 h-12 text-gray-400" />
          <div className="absolute bottom-3 left-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {property.availableRooms} rooms available
          </div>
          <div className="absolute top-3 right-3 text-xs bg-white text-gray-700 font-semibold px-2.5 py-1 rounded-full shadow-sm">
            🚶 {property.distanceToGate} to gate
          </div>
        </div>

        <div className="p-5">
          {/* Room types with prices */}
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Available Room Types
          </h3>
          <div className="flex flex-col gap-2 mb-5">
            {property.roomTypes.map((type) => (
              <div
                key={type}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-2.5">
                  <BedDouble className="w-4 h-4 text-gray-400" />
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROOM_TYPE_COLORS[type] || 'bg-gray-100 text-gray-700'}`}>
                    {type}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  from ₦{property.priceFrom.toLocaleString()}
                  <span className="text-xs font-normal text-gray-400">/yr</span>
                </span>
              </div>
            ))}
          </div>

          {/* Key amenities */}
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Key Amenities
          </h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {property.amenities.slice(0, 6).map((amenity) => (
              <div
                key={amenity}
                className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-full"
              >
                <AmenityIcon label={amenity} />
                {amenity}
              </div>
            ))}
          </div>

          {/* Blocks info */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs text-gray-500">{property.blocks.length} blocks:</span>
            {property.blocks.map((block) => (
              <span key={block} className="text-xs bg-orange-50 text-orange-600 font-medium px-2 py-0.5 rounded-full">
                {block}
              </span>
            ))}
          </div>

          {/* CTA */}
          <Link
            href={`/property/${property.id}`}
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            View All Rooms & Book
            <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="text-center text-xs text-gray-400 mt-3">
            {property.totalRooms} total rooms · {property.availableRooms} currently available
          </p>
        </div>
      </div>
    </div>
  )
}
