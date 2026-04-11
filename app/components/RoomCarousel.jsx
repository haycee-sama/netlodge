// app/components/RoomCarousel.jsx
// Horizontal snap-scroll carousel for the Featured Rooms section
// on the homepage. Shows 1.15 cards on mobile to hint more content,
// 2.2 on tablet, and exactly 3 on desktop.
//
// Props:
//   rooms — array of room objects (same shape as featuredRooms in page.js)

'use client'

import { useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { ShieldCheck, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { Building2 } from 'lucide-react'

export default function RoomCarousel({ rooms }) {
  const trackRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  // Scroll to a specific card by index
  const scrollTo = useCallback((index) => {
    const track = trackRef.current
    if (!track) return
    const card = track.children[index]
    if (!card) return
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    setActiveIndex(index)
  }, [])

  const prev = () => scrollTo(Math.max(0, activeIndex - 1))
  const next = () => scrollTo(Math.min(rooms.length - 1, activeIndex + 1))

  // Update active index on scroll
  const handleScroll = () => {
    const track = trackRef.current
    if (!track) return
    const scrollLeft = track.scrollLeft
    const cardWidth = track.children[0]?.offsetWidth + 20 // 20 = gap
    const index = Math.round(scrollLeft / (cardWidth || 1))
    setActiveIndex(Math.min(index, rooms.length - 1))
  }

  return (
    <div className="relative">
      {/* Carousel track */}
      <div
        ref={trackRef}
        className="carousel-track"
        onScroll={handleScroll}
        style={{ paddingLeft: '0px', paddingRight: '20px' }}
      >
        {rooms.map((room, i) => (
          <div
            key={room.id}
            className="carousel-item"
            style={{
              width: 'clamp(280px, 75vw, 360px)',
            }}
          >
            <Link
              href={`/rooms/${room.id}`}
              className="block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group property-card"
            >
              {/* Room image area */}
              <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <Building2 className="w-12 h-12 text-gray-400" />

                {/* Badge */}
                <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${room.badgeColor}`}>
                  {room.badge}
                </span>

                {/* Verified shield */}
                <div className="absolute top-3 right-3 bg-white rounded-full p-1.5 shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                </div>
              </div>

              {/* Card body */}
              <div className="p-5">
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>{room.university} · {room.city}</span>
                </div>

                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-orange-500 transition-colors leading-tight">
                  {room.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{room.property}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {room.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div>
                    <span className="text-xl font-bold text-gray-900">
                      ₦{room.price}
                    </span>
                    <span className="text-sm text-gray-400"> / year</span>
                  </div>
                  <span className="text-xs font-medium bg-orange-50 text-orange-600 px-3 py-1 rounded-full">
                    {room.type}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Prev / Next arrow buttons — hidden on mobile, visible md+ */}
      <button
        onClick={prev}
        disabled={activeIndex === 0}
        aria-label="Previous room"
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center shadow-md hover:bg-orange-50 hover:border-orange-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all z-10"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>

      <button
        onClick={next}
        disabled={activeIndex === rooms.length - 1}
        aria-label="Next room"
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center shadow-md hover:bg-orange-50 hover:border-orange-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all z-10"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 mt-5">
        {rooms.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            aria-label={`Go to room ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === activeIndex
                ? 'w-6 h-2 bg-orange-500'
                : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
