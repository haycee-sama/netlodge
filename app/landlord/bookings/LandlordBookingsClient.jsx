// app/landlord/bookings/LandlordBookingsClient.jsx
'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import LandlordLayout from '../components/LandlordLayout'
import {
  CheckCircle, Clock, XCircle, Calendar, User, Search,
  ChevronDown, ChevronUp, Phone, Mail, Download,
} from 'lucide-react'

const STATUS_CONFIG = {
  confirmed:       { label: 'Confirmed', badge: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending_payment: { label: 'Pending',   badge: 'bg-amber-100 text-amber-700', icon: Clock       },
  draft:           { label: 'Draft',     badge: 'bg-gray-100 text-gray-500',   icon: Clock       },
  cancelled:       { label: 'Cancelled', badge: 'bg-red-100 text-red-600',     icon: XCircle     },
}

const PAYMENT_CONFIG = {
  paid:   'bg-green-100 text-green-700',
  unpaid: 'bg-gray-100 text-gray-500',
  failed: 'bg-red-100 text-red-600',
}

function BookingRow({ booking }) {
  const [expanded, setExpanded] = useState(false)
  const config = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.draft
  const StatusIcon = config.icon

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-orange-500">{booking.studentName.charAt(0)}</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 truncate">{booking.studentName}</p>
              <p className="text-xs text-gray-500 truncate">{booking.roomLabel} · {booking.blockName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${config.badge}`}>
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAYMENT_CONFIG[booking.paymentStatus]}`}>
              {booking.paymentStatus}
            </span>
          </div>

          <div className="text-right shrink-0">
            <p className="font-bold text-gray-900">₦{booking.roomPrice.toLocaleString()}</p>
            <p className="text-xs text-gray-400">{booking.paidAt ? new Date(booking.paidAt).toLocaleDateString() : '—'}</p>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            Move in: <span className="font-medium text-gray-700">{booking.moveInDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            End: <span className="font-medium text-gray-700">{booking.leaseEndDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="font-mono text-gray-400">{booking.bookingRef}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-5 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Student Contact</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <User className="w-4 h-4 text-orange-500" /> {booking.studentName}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="w-4 h-4 text-orange-500" /> {booking.studentPhone || '—'}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail className="w-4 h-4 text-orange-500" /> {booking.studentEmail}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment Breakdown</p>
              <div className="bg-white rounded-xl p-3 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Room price</span>
                  <span className="font-medium">₦{booking.roomPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Service fee</span>
                  <span className="font-medium text-gray-400">-₦{booking.serviceFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-2">
                  <span>You receive</span>
                  <span className="text-green-600">₦{booking.roomPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
            <button className="flex items-center gap-2 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-600 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              <Download className="w-4 h-4" />
              Download Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LandlordBookingsClient({ bookings }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const shouldReduceMotion = useReducedMotion()

  const FILTERS = ['All', 'confirmed', 'pending_payment', 'cancelled']

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      search === '' ||
      b.studentName.toLowerCase().includes(search.toLowerCase()) ||
      b.roomLabel.toLowerCase().includes(search.toLowerCase()) ||
      b.bookingRef.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'All' || b.status === filter
    return matchesSearch && matchesFilter
  })

  const totalRevenue = bookings.filter((b) => b.paymentStatus === 'paid').reduce((sum, b) => sum + b.roomPrice, 0)

  return (
    <LandlordLayout title="Booking Requests" subtitle={`${bookings.length} total bookings`}>
      <div className="flex flex-col gap-6">

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Bookings', value: bookings.length, color: 'text-gray-900' },
            { label: 'Confirmed',      value: bookings.filter((b) => b.status === 'confirmed').length, color: 'text-green-600' },
            { label: 'Pending',        value: bookings.filter((b) => b.status === 'pending_payment').length, color: 'text-blue-600' },
            { label: 'Total Received', value: `₦${(totalRevenue / 1000000).toFixed(2)}M`, color: 'text-orange-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name, room, or booking ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0 ${
                  filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {f === 'All' ? 'All' : f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05 } } }}
            className="flex flex-col gap-3"
          >
            {filtered.map((booking) => (
              <motion.div
                key={booking.id}
                variants={{ hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
              >
                <BookingRow booking={booking} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your search or filter.</p>
          </div>
        )}

      </div>
    </LandlordLayout>
  )
}