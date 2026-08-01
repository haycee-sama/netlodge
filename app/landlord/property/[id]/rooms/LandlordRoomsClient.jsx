// app/landlord/property/[id]/rooms/LandlordRoomsClient.jsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LandlordLayout from '../../../components/LandlordLayout'
import {
  Plus, BedDouble, CheckCircle, Clock, XCircle, ChevronLeft, Eye, Settings, AlertCircle,
} from 'lucide-react'
import { updateRoomStatus } from '../../../../../lib/actions/landlord'

const STATUS_STYLES = {
  Available: { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  Booked: { badge: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
  Maintenance: { badge: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
}
const STATUS_ICONS = { Available: CheckCircle, Booked: XCircle, Maintenance: Clock }

export default function LandlordRoomsClient({ property, propertyId }) {
  const router = useRouter()
  const [activeBlock, setActiveBlock] = useState(property.blocks[0]?.id ?? '')
  const [togglingRoomId, setTogglingRoomId] = useState(null)
  const [toggleError, setToggleError] = useState('')

  if (property.blocks.length === 0) {
    return (
      <LandlordLayout title={property.name} subtitle="Room Management">
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <BedDouble className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500">No rooms yet for this property.</p>
          <Link href={`/landlord/room/new?propertyId=${propertyId}`} className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors">
            Add Your First Room
          </Link>
        </div>
      </LandlordLayout>
    )
  }

  const currentBlock = property.blocks.find((b) => b.id === activeBlock) ?? property.blocks[0]
  const allRooms = property.blocks.flatMap((b) => b.rooms)
  const totalAvailable = allRooms.filter((r) => r.status === 'Available').length
  const totalBooked = allRooms.filter((r) => r.status === 'Booked').length
  const totalMaintenance = allRooms.filter((r) => r.status === 'Maintenance').length

  async function handleToggleStatus(room) {
    setTogglingRoomId(room.id)
    setToggleError('')

    const newStatus = room.status === 'Available' ? 'maintenance' : 'available'
    const result = await updateRoomStatus(room.id, newStatus)

    setTogglingRoomId(null)

    if ('error' in result) {
      setToggleError(result.error)
      return
    }

    router.refresh()
  }

  return (
    <LandlordLayout title={property.name} subtitle="Room Management">
      <div className="flex flex-col gap-6">

        <div className="flex items-center justify-between">
          <Link href="/landlord/properties" className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Properties
          </Link>
          <div className="flex items-center gap-3">
            <Link href={`/property/${propertyId}`} target="_blank" className="flex items-center gap-2 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-600 text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              <Eye className="w-4 h-4" /> Public View
            </Link>
            <Link href={`/landlord/room/new?propertyId=${propertyId}`} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Add Room
            </Link>
          </div>
        </div>

        {toggleError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{toggleError}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Available', value: totalAvailable, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Booked', value: totalBooked, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Maintenance', value: totalMaintenance, color: 'text-gray-500', bg: 'bg-gray-50' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 text-center border border-white`}>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {property.blocks.map((block) => {
            const blockAvailable = block.rooms.filter((r) => r.status === 'Available').length
            const isActive = activeBlock === block.id || currentBlock.id === block.id
            return (
              <button
                key={block.id} onClick={() => setActiveBlock(block.id)}
                className={`flex flex-col items-center px-5 py-3 rounded-xl border-2 shrink-0 transition-all ${
                  isActive ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                <span className="text-sm font-bold">{block.name}</span>
                <span className={`text-xs mt-0.5 ${isActive ? 'text-gray-300' : 'text-green-500'}`}>
                  {blockAvailable} free · {block.rooms.length} total
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{currentBlock.name}</span> · {currentBlock.rooms.length} rooms
          </p>
          <Link href={`/landlord/room/new?propertyId=${propertyId}`} className="text-sm text-orange-500 font-semibold hover:underline flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add room to {currentBlock.name}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentBlock.rooms.map((room) => {
            const statusStyle = STATUS_STYLES[room.status]
            const StatusIcon = STATUS_ICONS[room.status]
            const isToggling = togglingRoomId === room.id

            return (
              <div key={room.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                  <BedDouble className="w-10 h-10 text-gray-300" />
                  <span className={`absolute top-3 right-3 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} /> {room.status}
                  </span>
                  <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full">{room.number}</div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{room.type}</p>
                      <p className="text-xs text-gray-500">{room.floor} Floor · {room.bathroom}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      ₦{room.price.toLocaleString()}<span className="text-xs font-normal text-gray-400">/yr</span>
                    </p>
                  </div>

                  <div className="flex gap-2 text-xs text-gray-500 mb-4">
                    <span className={`px-2 py-0.5 rounded-full ${room.furnished === 'Yes' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {room.furnished === 'Yes' ? 'Furnished' : 'Unfurnished'}
                    </span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">{room.dimensions}</span>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/rooms/${room.id}`} target="_blank" className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-600 text-xs font-semibold py-2 rounded-xl transition-colors">
                      <Eye className="w-3.5 h-3.5" /> View
                    </Link>
                    <button
                      onClick={() => handleToggleStatus(room)}
                      disabled={isToggling || room.status === 'Booked'}
                      title={room.status === 'Booked' ? 'Cannot change status of a booked room' : ''}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        room.status === 'Available' ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'bg-green-50 hover:bg-green-100 text-green-600'
                      }`}
                    >
                      {isToggling ? '...' : room.status === 'Available' ? 'Mark Unavailable' : 'Mark Available'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          <Link
            href={`/landlord/room/new?propertyId=${propertyId}`}
            className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 rounded-2xl py-10 transition-all group min-h-[200px]"
          >
            <div className="w-12 h-12 bg-gray-100 group-hover:bg-orange-100 rounded-2xl flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6 text-gray-400 group-hover:text-orange-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-600 group-hover:text-orange-600 text-sm transition-colors">Add Room</p>
              <p className="text-xs text-gray-400 mt-0.5">Add to {currentBlock.name}</p>
            </div>
          </Link>
        </div>

      </div>
    </LandlordLayout>
  )
}