'use client'
// app/search/page.jsx
// Search & Listings — upgraded with:
// 1. Skeleton loading shimmer on filter changes
// 2. Active filter chips with individual remove buttons
// 3. Quick View modal on property cards
// 4. Smooth filter transitions

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  SlidersHorizontal,
  MapPin,
  ShieldCheck,
  Building2,
  BedDouble,
  ChevronDown,
  X,
  Users,
  ArrowRight,
  Eye,
} from 'lucide-react'
import { getPropertySummaries } from '../lib/data'
import QuickViewModal from '../components/QuickViewModal'
import PropertyCardSkeleton from '../components/PropertyCardSkeleton'
import useScrollReveal from '../hooks/useScrollReveal'

const ALL_PROPERTIES = getPropertySummaries()

const CITIES       = ['All Cities', 'Abuja', 'Lagos', 'Enugu']
const ROOM_TYPES   = ['All Types', 'Single', 'Shared', 'Self-Contain']
const UNIVERSITIES = [
  'All Universities',
  'University of Abuja',
  'UNILAG',
  'LASU',
  'UNN',
  'ESUT',
]

// ── Component ─────────────────────────────────────────────────

export default function SearchPage() {
  useScrollReveal()

  const [searchQuery, setSearchQuery]   = useState('')
  const [selectedCity, setSelectedCity] = useState('All Cities')
  const [selectedType, setSelectedType] = useState('All Types')
  const [selectedUni, setSelectedUni]   = useState('All Universities')
  const [maxBudget, setMaxBudget]       = useState(250000)
  const [showFilters, setShowFilters]   = useState(false)

  // Loading state for filter transitions
  const [isFiltering, setIsFiltering] = useState(false)
  const [displayedProperties, setDisplayedProperties] = useState(ALL_PROPERTIES)

  // Quick view modal state
  const [quickViewProperty, setQuickViewProperty] = useState(null)

  // Recompute filtered results with a brief skeleton delay
  const applyFilters = useCallback(() => {
    setIsFiltering(true)
    // Short delay to show skeleton — simulates async filter
    const timer = setTimeout(() => {
      const result = ALL_PROPERTIES.filter((p) => {
        const matchesQuery =
          searchQuery === '' ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.city.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesCity = selectedCity === 'All Cities' || p.city === selectedCity
        const matchesType = selectedType === 'All Types' || p.roomTypes.includes(selectedType)
        const matchesUni  = selectedUni === 'All Universities' || p.university === selectedUni
        const matchesBudget = p.priceFrom <= maxBudget

        return matchesQuery && matchesCity && matchesType && matchesUni && matchesBudget
      })
      setDisplayedProperties(result)
      setIsFiltering(false)
    }, 350)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedCity, selectedType, selectedUni, maxBudget])

  useEffect(() => {
    const cleanup = applyFilters()
    return cleanup
  }, [applyFilters])

  function clearFilters() {
    setSearchQuery('')
    setSelectedCity('All Cities')
    setSelectedType('All Types')
    setSelectedUni('All Universities')
    setMaxBudget(250000)
  }

  // Build the list of active filter chips to display above results
  const activeFilters = []
  if (searchQuery)                          activeFilters.push({ label: `"${searchQuery}"`,   clear: () => setSearchQuery('') })
  if (selectedCity !== 'All Cities')        activeFilters.push({ label: selectedCity,          clear: () => setSelectedCity('All Cities') })
  if (selectedType !== 'All Types')         activeFilters.push({ label: selectedType,          clear: () => setSelectedType('All Types') })
  if (selectedUni  !== 'All Universities')  activeFilters.push({ label: selectedUni,           clear: () => setSelectedUni('All Universities') })
  if (maxBudget    < 250000)                activeFilters.push({ label: `Up to ₦${maxBudget.toLocaleString()}`, clear: () => setMaxBudget(250000) })

  const hasActiveFilters = activeFilters.length > 0

  return (
    <div className="min-h-screen bg-gray-50 page-enter">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Find a Hostel</h1>
          <p className="text-gray-500 text-sm">
            {displayedProperties.length} verified {displayedProperties.length === 1 ? 'property' : 'properties'} available
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Sidebar Filters ── */}
          <aside className="w-full lg:w-72 shrink-0">

            <button
              className="lg:hidden w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 font-medium text-gray-700"
              onClick={() => setShowFilters(!showFilters)}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                Filters
                {hasActiveFilters && (
                  <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFilters.length}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-6">

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold text-gray-900">Filters</span>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-orange-500 font-medium hover:text-orange-600 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Clear all
                    </button>
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <div className="flex flex-col gap-1">
                    {CITIES.map((city) => (
                      <button
                        key={city}
                        onClick={() => setSelectedCity(city)}
                        className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                          selectedCity === city
                            ? 'bg-orange-50 text-orange-600 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Room Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Type</label>
                  <div className="flex flex-col gap-1">
                    {ROOM_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                          selectedType === type
                            ? 'bg-orange-50 text-orange-600 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* University */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">University</label>
                  <select
                    value={selectedUni}
                    onChange={(e) => setSelectedUni(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  >
                    {UNIVERSITIES.map((uni) => (
                      <option key={uni} value={uni}>{uni}</option>
                    ))}
                  </select>
                </div>

                {/* Budget */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Starting From</label>
                    <span className="text-sm font-semibold text-orange-500">
                      ₦{maxBudget.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50000}
                    max={250000}
                    step={10000}
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>₦50,000</span>
                    <span>₦250,000</span>
                  </div>
                </div>

              </div>
            </div>
          </aside>

          {/* ── Results column ── */}
          <div className="flex-1">

            {/* Search bar */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by hostel name, university, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* ── Active filter chips ── */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {activeFilters.map((filter) => (
                  <button
                    key={filter.label}
                    onClick={filter.clear}
                    className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors"
                  >
                    {filter.label}
                    <X className="w-3 h-3" />
                  </button>
                ))}
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 underline"
                >
                  Clear all
                </button>
              </div>
            )}

            <p className="text-sm text-gray-500 mb-4">
              {isFiltering ? (
                <span className="text-gray-400">Filtering...</span>
              ) : (
                <>
                  Showing <span className="font-semibold text-gray-900">{displayedProperties.length}</span>{' '}
                  {displayedProperties.length === 1 ? 'property' : 'properties'}
                  {hasActiveFilters && ' matching your filters'}
                </>
              )}
            </p>

            {/* ── Property cards or skeletons ── */}
            {isFiltering ? (
              // Show 3 skeleton placeholders during filter transition
              <div className="flex flex-col gap-5">
                {[1, 2, 3].map((n) => (
                  <PropertyCardSkeleton key={n} />
                ))}
              </div>
            ) : displayedProperties.length > 0 ? (
              <div className="flex flex-col gap-5">
                {displayedProperties.map((property) => (
                  <div
                    key={property.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group property-card flex flex-col sm:flex-row"
                  >
                    {/* Property image area */}
                    <div className="relative sm:w-56 h-48 sm:h-auto bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shrink-0">
                      <Building2 className="w-12 h-12 text-gray-400" />

                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-600">Verified</span>
                      </div>

                      <div className="absolute bottom-3 left-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {property.availableRooms} rooms free
                      </div>

                      {/* Quick View button — appears on hover */}
                      <button
                        onClick={() => setQuickViewProperty(property)}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-200"
                        aria-label={`Quick view ${property.name}`}
                      >
                        <span className="flex items-center gap-1.5 bg-white text-gray-800 text-xs font-bold px-3 py-2 rounded-full opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 shadow-md">
                          <Eye className="w-3.5 h-3.5" />
                          Quick View
                        </span>
                      </button>
                    </div>

                    {/* Property info */}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 text-lg group-hover:text-orange-500 transition-colors">
                            {property.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-orange-500" />
                          {property.university} · {property.city}
                        </div>

                        <p className="text-xs text-gray-400 mb-3">
                          🚶 {property.distanceToGate} to university gate
                        </p>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {property.roomTypes.map((type) => (
                            <span
                              key={type}
                              className="text-xs bg-orange-50 text-orange-600 font-medium px-2.5 py-1 rounded-full"
                            >
                              {type}
                            </span>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {property.amenities.slice(0, 4).map((a) => (
                            <span
                              key={a}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <BedDouble className="w-4 h-4" />
                            <span>{property.totalRooms} total rooms</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{property.blocks.length} blocks</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Starting from</p>
                            <p className="font-bold text-gray-900">
                              ₦{property.priceFrom.toLocaleString()}
                              <span className="text-sm font-normal text-gray-400"> /yr</span>
                            </p>
                          </div>
                          <Link
                            href={`/property/${property.id}`}
                            className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                          >
                            View Rooms
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">No properties found</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-xs">
                  Try adjusting your filters or search term.
                </p>
                <button
                  onClick={clearFilters}
                  className="bg-orange-500 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-orange-600 transition-colors text-sm"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {quickViewProperty && (
        <QuickViewModal
          property={quickViewProperty}
          onClose={() => setQuickViewProperty(null)}
        />
      )}
    </div>
  )
}
