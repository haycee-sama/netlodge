'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, ArrowRight } from 'lucide-react'
import { SERVICE_FEE_RATE } from '../../../lib/data'

const LEASE_OPTIONS = ['1 Year', 'Per Semester', 'Half Year']

export default function RoomBookingPanel({ room, property }) {
  const [selectedLease, setSelectedLease]   = useState('1 Year')
  const [showEscrowInfo, setShowEscrowInfo] = useState(false)

  const serviceFee = Math.round(room.price * SERVICE_FEE_RATE)
  const total      = room.price + serviceFee

  return (
    <div className="sticky top-24 flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
        <div className="mb-5">
          <span className="text-3xl font-bold text-gray-900">₦{room.price.toLocaleString()}</span>
          <span className="text-gray-400 text-sm"> / year</span>
        </div>

        {room.status !== 'Available' && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
            <p className="text-sm text-red-600 font-medium text-center">
              This room is currently {room.status.toLowerCase()}
            </p>
          </div>
        )}

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Lease Duration</label>
          <div className="flex flex-col gap-2">
            {LEASE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedLease(option)}
                className={`text-sm font-medium px-4 py-2.5 rounded-xl border transition-all text-left ${
                  selectedLease === option ? 'bg-orange-50 border-orange-400 text-orange-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 py-4 border-t border-b border-gray-100 mb-5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Room price</span>
            <span className="font-medium text-gray-800">₦{room.price.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Service fee (7%)</span>
            <span className="font-medium text-gray-800">₦{serviceFee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1">
            <span className="text-gray-900">Total</span>
            <span className="text-orange-500">₦{total.toLocaleString()}</span>
          </div>
        </div>

        {room.status === 'Available' ? (
          <Link
            href={`/booking/confirm?roomId=${room.id}&lease=${encodeURIComponent(selectedLease)}`}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-colors text-base"
          >
            Book This Room <ArrowRight className="w-5 h-5" />
          </Link>
        ) : (
          <button disabled className="w-full bg-gray-100 text-gray-400 font-bold py-4 rounded-xl cursor-not-allowed text-base">
            {room.status === 'Booked' ? 'Currently Booked' : 'Under Maintenance'}
          </button>
        )}

        <button
          onClick={() => setShowEscrowInfo(!showEscrowInfo)}
          className="w-full text-center text-xs text-gray-400 hover:text-orange-500 mt-3 transition-colors"
        >
          🔒 How is my payment protected?
        </button>

        {showEscrowInfo && (
          <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs text-blue-700 leading-relaxed">
              Your payment is held in escrow for 48 hours after booking.
              If the room does not match the listing you can file a dispute and receive a full refund.
            </p>
          </div>
        )}
      </div>

      <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800 mb-1">Safe to Book</p>
            <ul className="text-xs text-green-700 flex flex-col gap-1">
              <li>✓ Landlord identity verified</li>
              <li>✓ Property documents checked</li>
              <li>✓ Escrow payment protection</li>
              <li>✓ 48-hour dispute window</li>
            </ul>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        Something look wrong?{' '}
        <Link href="/contact" className="text-orange-500 hover:underline">Report this listing</Link>
      </p>
    </div>
  )
}