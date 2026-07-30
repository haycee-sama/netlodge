import Link from 'next/link'
import { ShieldCheck, MapPin, Building2, ChevronLeft } from 'lucide-react'
import { getPropertyById } from '../../../lib/data'
import PropertyBookingPanel from './PropertyBookingPanel'

export async function generateMetadata({ params }) {
  const { id } = await params
  const property = getPropertyById(id)

  if (!property) {
    return { title: 'Property Not Found' }
  }

  const title = `${property.name} — Verified Rooms Near ${property.university}`
  const description = `Book a verified room at ${property.name}, ${property.distanceToGate} from ${property.university} in ${property.city}. Escrow-protected payments, landlord verified.`
  const url = `https://netlodge.ng/property/${id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Netlodge', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PropertyPage({ params }) {
  const { id } = await params
  const property = getPropertyById(id)

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-bold text-gray-900">Property not found</p>
        <Link href="/search" className="text-orange-500 hover:underline">Back to Search</Link>
      </div>
    )
  }

  const allRooms = property.blocks.flatMap((b) => b.rooms)
  const totalAvailable = allRooms.filter((r) => r.status === 'Available').length
  const totalBooked = allRooms.filter((r) => r.status === 'Booked').length
  const totalMaintenance = allRooms.filter((r) => r.status === 'Maintenance').length

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-orange-500">Home</Link>
            <span>/</span>
            <Link href="/search" className="hover:text-orange-500">Search</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{property.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Link href="/search" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Search
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Property
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{property.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  {property.address}
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  {property.university}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs bg-blue-50 text-blue-600 font-medium px-3 py-1 rounded-full">🚶 {property.distanceToGate} to gate</span>
                <span className="text-xs bg-blue-50 text-blue-600 font-medium px-3 py-1 rounded-full">🏫 {property.distanceToFaculty} to faculty</span>
                <span className="text-xs bg-blue-50 text-blue-600 font-medium px-3 py-1 rounded-full">🛒 {property.distanceToMarket} to market</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 shrink-0 min-w-48">
              <p className="text-xs text-gray-400 mb-2">Property Owner</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-orange-500">{property.landlord.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{property.landlord.name}</p>
                  {property.landlord.verified && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">{property.landlord.responseTime}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-gray-100">
            {property.amenities.map((a) => (
              <span key={a} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">{a}</span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalAvailable}</p>
            <p className="text-xs text-gray-500 mt-0.5">Available</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{totalBooked}</p>
            <p className="text-xs text-gray-500 mt-0.5">Booked</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">{totalMaintenance}</p>
            <p className="text-xs text-gray-500 mt-0.5">Maintenance</p>
          </div>
        </div>

        <PropertyBookingPanel property={property} />

      </div>
    </div>
  )
}