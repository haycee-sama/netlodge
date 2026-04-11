// app/search/page.jsx
'use client'

import { useState } from 'react'
import { useSearchParams} from 'next/navigation'
import Link from 'next/link'
import {
  Search, SlidersHorizontal, MapPin, ShieldCheck,
  Building2, BedDouble, ChevronDown, X, Users, ArrowRight,
} from 'lucide-react'

// Import real data from central data file
import { getPropertySummaries } from '../lib/data'

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

  const [searchQuery, setSearchQuery]   = useState('')
  const [selectedCity, setSelectedCity] = useState('All Cities')
  const [selectedType, setSelectedType] = useState('All Types')
  const [selectedUni, setSelectedUni]   = useState('All Universities')
  const [maxBudget, setMaxBudget]       = useState(250000)
  const [showFilters, setShowFilters]   = useState(false)

  // Filter properties based on all active filters
  const filtered = ALL_PROPERTIES.filter((p) => {

    const matchesQuery =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCity =
      selectedCity === 'All Cities' || p.city === selectedCity

    // Property matches type if ANY of its room types includes the selected type
    const matchesType =
      selectedType === 'All Types' || p.roomTypes.includes(selectedType)

    const matchesUni =
      selectedUni === 'All Universities' || p.university === selectedUni

    // Property matches budget if its starting price is within range
    const matchesBudget = p.priceFrom <= maxBudget

    return matchesQuery && matchesCity && matchesType && matchesUni && matchesBudget
  })

  function clearFilters() {
    setSearchQuery('')
    setSelectedCity('All Cities')
    setSelectedType('All Types')
    setSelectedUni('All Universities')
    setMaxBudget(250000)
  }

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCity !== 'All Cities' ||
    selectedType !== 'All Types' ||
    selectedUni !== 'All Universities' ||
    maxBudget < 250000

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Find a Hostel</h1>
          <p className="text-gray-500 text-sm">
            {filtered.length} verified properties available
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
                Filters {hasActiveFilters && '(Active)'}
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
                      <X className="w-3 h-3" /> Clear all
                    </button>
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <div className="flex flex-col gap-2">
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
                  <div className="flex flex-col gap-2">
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

          {/* ── Results ── */}
          <div className="flex-1">

            {/* Search bar */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by hostel name, university, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 shadow-sm"
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

            <p className="text-sm text-gray-500 mb-4">
              Showing <span className="font-semibold text-gray-900">{filtered.length}</span> properties
              {hasActiveFilters && ' matching your filters'}
            </p>

            {/* Property Cards */}
            {filtered.length > 0 ? (
              <div className="flex flex-col gap-5">
                {filtered.map((property) => (
                  <Link
                    key={property.id}
                    href={`/property/${property.id}`}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group flex flex-col sm:flex-row"
                  >
                    {/* Property image placeholder */}
                    <div className="relative sm:w-56 h-48 sm:h-auto bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shrink-0">
                      <Building2 className="w-12 h-12 text-gray-400" />

                      {/* Verified badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-600">Verified</span>
                      </div>

                      {/* Available rooms count */}
                      <div className="absolute bottom-3 left-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {property.availableRooms} rooms free
                      </div>
                    </div>

                    {/* Property info */}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div>
                        {/* Name + location */}
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

                        {/* Room types available */}
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

                        {/* Amenity chips */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {property.amenities.map((a) => (
                            <span
                              key={a}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Bottom row — price + stats + CTA */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">

                        {/* Room count */}
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

                        {/* Price range + CTA */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Starting from</p>
                            <p className="font-bold text-gray-900">
                              ₦{property.priceFrom.toLocaleString()}
                              <span className="text-sm font-normal text-gray-400"> /yr</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1 bg-orange-500 group-hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                            View Rooms
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>

                      </div>
                    </div>
                  </Link>
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
    </div>
  )
}