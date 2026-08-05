// app/(admin)/admin/properties/PropertyModerationClient.jsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, MapPin, ShieldCheck, ShieldOff, Eye, AlertCircle } from 'lucide-react'
import { togglePropertyVerification } from '../../../../lib/actions/admin'

function PropertyRow({ property }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function toggle() {
    setError('')
    startTransition(async () => {
      const result = await togglePropertyVerification(property.id)
      if ('error' in result) { setError(result.error); return }
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-orange-500" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 truncate">{property.name}</p>
            {property.isVerified ? (
              <span className="flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                <ShieldOff className="w-3 h-3" /> Unverified
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <MapPin className="w-3 h-3" /> {property.address} · {property.city}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {property.totalRooms} rooms · Landlord: {property.landlordName}
            {!property.landlordVerified && <span className="text-amber-600 font-medium"> (landlord not KYC-verified)</span>}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 shrink-0">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/property/${property.id}`}
          target="_blank"
          className="flex items-center gap-1.5 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-600 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </Link>
        <button
          onClick={toggle}
          disabled={isPending}
          className={`text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${
            property.isVerified
              ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white'
          }`}
        >
          {isPending ? '...' : property.isVerified ? 'Unverify' : 'Verify'}
        </button>
      </div>
    </div>
  )
}

export default function PropertyModerationClient({ properties }) {
  const [filter, setFilter] = useState('All')
  const FILTERS = ['All', 'Verified', 'Unverified']

  const filtered = properties.filter((p) => {
    if (filter === 'Verified') return p.isVerified
    if (filter === 'Unverified') return !p.isVerified
    return true
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
          <Building2 className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No properties match this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((p) => <PropertyRow key={p.id} property={p} />)}
        </div>
      )}
    </div>
  )
}