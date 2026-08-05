// app/(student)/saved/SavedRoomsClient.jsx
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Heart, MapPin, Building2, X, ArrowRight, Search, ShieldCheck,
} from 'lucide-react'
import { toggleSaveRoom } from '../../../lib/actions/student'
import { useToast } from '../../components/ToastProvider'

const STATUS_DOT = { Available: 'bg-green-500', Booked: 'bg-red-500', Maintenance: 'bg-gray-400' }

export default function SavedRoomsClient({ savedRooms }) {
  const [rooms, setRooms] = useState(savedRooms)
  const [removingId, setRemovingId] = useState(null)
  const [isPending, startTransition] = useTransition()
  const shouldReduceMotion = useReducedMotion()
  const toast = useToast()

  function removeRoom(savedId, roomId) {
    setRemovingId(savedId)
    startTransition(async () => {
      const result = await toggleSaveRoom(roomId)
      setRemovingId(null)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      setRooms((prev) => prev.filter((r) => r.id !== savedId))
      toast.success('Room removed from your saved list.')
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-400" />
                Saved Rooms
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {rooms.length} room{rooms.length !== 1 ? 's' : ''} saved
              </p>
            </div>
            <Link href="/search" className="flex items-center gap-2 text-sm font-semibold text-orange-500 hover:underline">
              <Search className="w-4 h-4" />
              Browse more rooms
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {rooms.length > 0 ? (
          <motion.div
            initial="hidden" animate="show"
            variants={{ show: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {rooms.map((room) => (
              <motion.div
                key={room.id}
                variants={{ hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
              >
                <div className="relative h-44 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  {room.images?.[0] ? (
                    <Image
                      src={room.images[0].url}
                      alt={room.images[0].alt || ''}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <Building2 className="w-10 h-10 text-gray-400" />
                  )}

                  <button
                    onClick={() => removeRoom(room.id, room.roomId)}
                    disabled={isPending && removingId === room.id}
                    aria-label={`Remove Room ${room.roomNumber} from saved rooms`}
                    className="absolute top-3 right-3 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors text-gray-500 disabled:opacity-50 z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-sm z-10">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs font-medium text-green-600">Verified</span>
                  </div>

                  <span className={`absolute bottom-3 left-3 text-xs font-semibold text-white px-2.5 py-1 rounded-full z-10 ${STATUS_DOT[room.status] ?? 'bg-gray-400'}`}>
                    {room.status}
                  </span>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-1.5">
                    <MapPin className="w-3 h-3" />
                    {room.university} · {room.city}
                  </div>

                  <h3 className="font-bold text-gray-900 mb-0.5 text-sm line-clamp-2">
                    Room {room.roomNumber} — {room.roomType}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">{room.propertyName}</p>

                  <div className="flex gap-3 text-xs text-gray-500 mb-4">
                    <span className="bg-orange-50 text-orange-600 font-medium px-2 py-1 rounded-full">{room.roomType}</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{room.bathroom}</span>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-gray-900">₦{room.price.toLocaleString()}</span>
                      <span className="text-xs text-gray-400"> /yr</span>
                    </div>
                    <Link
                      href={`/rooms/${room.roomId}`}
                      className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                    >
                      {room.status === 'Available' ? 'Book Now' : 'View'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-5">
              <Heart className="w-10 h-10 text-red-300" />
            </div>
            <h3 className="font-bold text-gray-900 text-xl mb-2">No Saved Rooms</h3>
            <p className="text-gray-500 text-sm mb-8 max-w-xs">
              When you find rooms you like on the search page, save them here to compare later.
            </p>
            <Link href="/search" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl transition-colors">
              <Search className="w-5 h-5" />
              Browse Verified Rooms
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}