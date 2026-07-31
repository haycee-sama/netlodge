import Link from 'next/link'
import {
  ShieldCheck, MapPin, Wifi, Zap, Droplets,
  ChevronLeft, Building2, Lock, CheckCircle, AlertCircle,
} from 'lucide-react'
import { getRoomById } from '../../../lib/data'
import RoomBookingPanel from './RoomBookingPanel'
import RoomImageCarousel from './RoomImageCarousel'

const AMENITY_ICONS = { power: Zap, water: Droplets, internet: Wifi, security: Lock, extras: CheckCircle }
const AMENITY_LABELS = {
  power: '⚡ Power', water: '💧 Water', internet: '📶 Internet',
  security: '🔒 Security', extras: '✨ Extras',
}

function AmenityChip({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
      <Icon className="w-4 h-4 text-orange-500 shrink-0" />
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  )
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const result = getRoomById(id)

  if (!result) {
    return { title: 'Room Not Found' }
  }

  const { room, property } = result
  const title = `Room ${room.number} — ${room.type} at ${property.name}`
  const description = `₦${room.price.toLocaleString()}/year · ${room.bathroom} bathroom · ${room.furnished === 'Yes' ? 'Furnished' : 'Unfurnished'} · ${property.university}, ${property.city}. Escrow-protected booking.`
  const url = `https://netlodge.ng/rooms/${id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Netlodge', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function RoomDetailPage({ params }) {
  const { id } = await params
  const result = getRoomById(id)

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-bold text-gray-900">Room not found</p>
        <Link href="/search" className="text-orange-500 hover:underline">Back to Search</Link>
      </div>
    )
  }

  const { room, block, property } = result

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <Link href="/" className="hover:text-orange-500">Home</Link><span>/</span>
            <Link href="/search" className="hover:text-orange-500">Search</Link><span>/</span>
            <Link href={`/property/${property.id}`} className="hover:text-orange-500">{property.name}</Link><span>/</span>
            <span className="text-gray-900 font-medium">Room {room.number}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Link href={`/property/${property.id}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to {property.name}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Photo Gallery */}
            <RoomImageCarousel images={room.images} />

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Listing
                </div>
                <span className="text-xs font-semibold bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full">{room.type}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Room {room.number} — {room.type} · {block.name}
              </h1>
              <Link href={`/property/${property.id}`} className="text-orange-500 font-medium text-sm hover:underline">
                {property.name}
              </Link>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-orange-500" />{property.address}</div>
                <div className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-orange-500" />{property.university}</div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-xs bg-blue-50 text-blue-600 font-medium px-3 py-1 rounded-full">🚶 {property.distanceToGate} to gate</span>
                <span className="text-xs bg-blue-50 text-blue-600 font-medium px-3 py-1 rounded-full">🏫 {property.distanceToFaculty} to faculty</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Room Details</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <DetailRow label="Room Number" value={room.number} />
                <DetailRow label="Room Type" value={room.type} />
                <DetailRow label="Floor" value={`${room.floor} Floor`} />
                <DetailRow label="Dimensions" value={room.dimensions} />
                <DetailRow label="Bathroom" value={room.bathroom} />
                <DetailRow label="Furnished" value={room.furnished === 'Yes' ? 'Yes' : 'No'} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-5">Amenities</h2>
              {Object.entries(room.amenities).map(([category, items]) => (
                <div key={category} className="mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{AMENITY_LABELS[category]}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map((item) => {
                      const Icon = AMENITY_ICONS[category]
                      return <AmenityChip key={item} icon={Icon} label={item} />
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">House Rules</h2>
              <ul className="flex flex-col gap-3">
                {property.rules.map((rule) => (
                  <li key={rule} className="flex items-start gap-3 text-sm text-gray-600">
                    <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />{rule}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">About the Landlord</h2>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-orange-500">{property.landlord.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900">{property.landlord.name}</p>
                    {property.landlord.verified && (
                      <div className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-1">{property.landlord.responseTime}</p>
                  <p className="text-sm text-gray-500">Manages {property.landlord.propertiesManaged} properties on Netlodge</p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Landlord contact details are only revealed after a successful booking payment.</p>
              </div>
            </div>

          </div>

          <div className="lg:col-span-1">
            <RoomBookingPanel room={room} property={property} />
          </div>

        </div>
      </div>
    </div>
  )
}