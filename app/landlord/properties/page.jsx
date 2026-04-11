// app/landlord/properties/page.jsx
// My Properties page — /landlord/properties
// Lists all of the landlord's properties with occupancy and quick links

import Link from 'next/link'
import LandlordLayout from '../components/LandlordLayout'
import { getPropertySummaries } from '../../lib/data'
import {
  Building2,
  MapPin,
  BedDouble,
  Plus,
  ArrowRight,
  ShieldCheck,
  Eye,
  Settings,
} from 'lucide-react'

export default function LandlordPropertiesPage() {

  const properties = getPropertySummaries()

  return (
    <LandlordLayout
      title="My Properties"
      subtitle={`${properties.length} properties registered`}
    >
      <div className="flex flex-col gap-6">

        {/* ── Header actions ── */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3 text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{properties.length}</span> properties ·
            <span className="font-semibold text-gray-900">
              {properties.reduce((s, p) => s + p.totalRooms, 0)}
            </span> total rooms ·
            <span className="font-semibold text-green-600">
              {properties.reduce((s, p) => s + p.availableRooms, 0)}
            </span> available
          </div>
          <Link
            href="/landlord/property/new"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </Link>
        </div>

        {/* ── Property Cards ── */}
        <div className="grid grid-cols-1 gap-5">
          {properties.map((property) => {
            const occupied  = property.totalRooms - property.availableRooms
            const occupancy = Math.round((occupied / property.totalRooms) * 100)

            return (
              <div
                key={property.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row">

                  {/* Property image placeholder */}
                  <div className="sm:w-48 h-36 sm:h-auto bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shrink-0 relative">
                    <Building2 className="w-10 h-10 text-gray-400" />
                    {/* Verified badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs font-medium text-green-600">Verified</span>
                    </div>
                  </div>

                  {/* Property info */}
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{property.name}</h3>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-orange-500" />
                          {property.university} · {property.city}
                        </div>
                      </div>
                      {/* Occupancy badge */}
                      <div className={`shrink-0 px-3 py-1 rounded-full text-sm font-bold ${
                        occupancy >= 80
                          ? 'bg-green-100 text-green-700'
                          : occupancy >= 50
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {occupancy}% full
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: 'Total Rooms',  value: property.totalRooms },
                        { label: 'Occupied',     value: occupied },
                        { label: 'Available',    value: property.availableRooms },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-lg font-bold text-gray-900">{value}</p>
                          <p className="text-xs text-gray-500">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Occupancy bar */}
                    <div className="mb-4">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all"
                          style={{ width: `${occupancy}%` }}
                        />
                      </div>
                    </div>

                    {/* Block chips */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {property.blocks.map((block) => (
                        <span
                          key={block}
                          className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full"
                        >
                          {block}
                        </span>
                      ))}
                    </div>

                    {/* Price range */}
                    <p className="text-sm text-gray-500 mb-4">
                      Rooms from{' '}
                      <span className="font-bold text-gray-900">
                        ₦{property.priceFrom.toLocaleString()}
                      </span>
                      {' '}to{' '}
                      <span className="font-bold text-gray-900">
                        ₦{property.priceTo.toLocaleString()}
                      </span>
                      {' '}/yr
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/landlord/property/${property.id}/rooms`}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
                      >
                        <BedDouble className="w-4 h-4" />
                        Manage Rooms
                      </Link>
                      <Link
                        href={`/property/${property.id}`}
                        target="_blank"
                        className="flex items-center gap-2 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-600 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Public Page
                      </Link>
                    </div>

                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add property card */}
        <Link
          href="/landlord/property/new"
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 rounded-2xl py-12 transition-all group"
        >
          <div className="w-12 h-12 bg-gray-100 group-hover:bg-orange-100 rounded-2xl flex items-center justify-center transition-colors">
            <Plus className="w-6 h-6 text-gray-400 group-hover:text-orange-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700 group-hover:text-orange-600 transition-colors">
              Add Another Property
            </p>
            <p className="text-sm text-gray-400">
              Register a new hostel or property
            </p>
          </div>
        </Link>

      </div>
    </LandlordLayout>
  )
}