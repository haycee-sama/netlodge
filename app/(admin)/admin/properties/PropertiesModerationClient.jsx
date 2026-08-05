// app/(admin)/admin/properties/PropertiesModerationClient.jsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, ShieldCheck, ShieldOff, Search, ExternalLink,
} from 'lucide-react'
import { togglePropertyVerification } from '../../../../lib/actions/admin'

function PropertyRow({ property }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleToggle() {
    setError('')
    startTransition(async () => {
      const result = await togglePropertyVerification(property.id)
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-orange-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{property.name}</p>
          <p className="text-xs text-gray-500 truncate">{property.landlordName} - {property.university} - {property.city}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
        <span>{property.totalRooms} rooms</span>
        <span>{property.availableRooms} available</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/property/${property.id}`}
          target="_blank"
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-500 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View
        </Link>
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50 ${
            property.isVerified
              ? 'bg-green-50 text-green-700 hover:bg-green-100'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {property.isVerified ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
          {isPending ? 'Updating...' : property.isVerified ? 'Verified' : 'Not Verified'}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 w-full">{error}</p>}
    </div>
  )
}

export default function PropertiesModerationClient({ properties }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = properties.filter((p) => {
    const matchesSearch =
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.landlordName.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Verified' ? p.isVerified : !p.isVerified)
    return matchesSearch && matchesFilter
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Property Moderation</h1>
        <p className="text-gray-500 text-sm mt-1">{properties.length} properties on the platform</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by property or landlord name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Verified', 'Unverified'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length > 0 ? (
          filtered.map((property) => <PropertyRow key={property.id} property={property} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No properties match this search or filter.</p>
          </div>
        )}
      </div>
    </div>
  )
}