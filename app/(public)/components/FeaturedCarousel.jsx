'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, ShieldCheck, MapPin } from 'lucide-react'

const BADGES = [
  { label: 'Most Popular', color: 'bg-orange-100 text-orange-700' },
  { label: 'Verified',     color: 'bg-green-100 text-green-700'  },
  { label: 'Best Value',   color: 'bg-blue-100 text-blue-700'    },
]

export default function FeaturedCarousel({ properties }) {
  const trackRef = useRef(null)
  const cardRefs = useRef([])
  const [activeIndex, setActiveIndex] = useState(0)

  // Track which card is centered as the user swipes, so dots stay in sync
  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = cardRefs.current.indexOf(entry.target)
            if (index !== -1) setActiveIndex(index)
          }
        })
      },
      { root: track, threshold: 0.6 }
    )

    cardRefs.current.forEach((card) => card && observer.observe(card))
    return () => observer.disconnect()
  }, [properties.length])

  function scrollToIndex(index) {
    cardRefs.current[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }

  return (
    <div>
      <div
        ref={trackRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured rooms"
        tabIndex={0}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-2xl"
      >
        {properties.map((property, index) => {
          const badge = BADGES[index % BADGES.length]
          return (
            <div
              key={property.id}
              ref={(el) => (cardRefs.current[index] = el)}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${properties.length}`}
              className="snap-center shrink-0 w-[85vw] sm:w-auto"
            >
              <Link
                href={`/property/${property.id}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 overflow-hidden group"
              >
                <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden">
                  {property.thumbnail ? (
                    <Image
                      src={property.thumbnail.url}
                      alt={property.thumbnail.alt}
                      fill
                      sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Building2 className="w-12 h-12 text-gray-400" />
                  )}
                  <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.color}`}>
                    {badge.label}
                  </span>
                  <div className="absolute top-3 right-3 bg-white rounded-full p-1.5 shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                    <MapPin className="w-3 h-3" />
                    <span>{property.university} · {property.city}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 group-hover:text-orange-500 transition-colors">
                    {property.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {property.availableRooms} rooms available
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <span className="text-xl font-bold text-gray-900">
                        ₦{property.priceFrom.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-400"> / year</span>
                    </div>
                    <span className="text-xs font-medium bg-orange-50 text-orange-600 px-3 py-1 rounded-full">
                      From
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>

      {/* Dot indicators — mobile only, hidden once desktop grid takes over */}
      <div className="flex sm:hidden justify-center gap-2 mt-4">
        {properties.map((property, index) => (
          <button
            key={property.id}
            onClick={() => scrollToIndex(index)}
            aria-label={`Go to slide ${index + 1} of ${properties.length}`}
            aria-current={activeIndex === index}
            className={`h-2 rounded-full transition-all ${
              activeIndex === index ? 'w-6 bg-orange-500' : 'w-2 bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  )
}