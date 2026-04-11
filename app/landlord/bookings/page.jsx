// app/landlord/bookings/page.jsx
// Landlord booking requests — /landlord/bookings
// Shows all incoming bookings with tenant info, payment status, and actions

'use client'

import { useState } from 'react'
import LandlordLayout from '../components/LandlordLayout'
import {
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Calendar,
  User,
  Search,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Download,
  AlertCircle,
} from 'lucide-react'

// ── Mock booking data ─────────────────────────────────────────
const ALL_BOOKINGS = [
  {
    id:          'BK-2026-0042',
    student:     { name: 'Amara Okonkwo',   phone: '08012345678', email: 'amara@gmail.com',   university: 'University of Abuja' },
    room:        'Room A05 — Self-Contain',
    block:       'Block A',
    property:    'Sunrise Hostel',
    moveIn:      'April 1, 2026',
    leaseEnd:    'March 31, 2027',
    leaseType:   '1 Year',
    amount:      180000,
    serviceFee:  12600,
    total:       192600,
    status:      'Confirmed',
    paymentStatus: 'Paid',
    paidOn:      'March 25, 2026',
    escrowStatus:'Released',
  },
  {
    id:          'BK-2026-0039',
    student:     { name: 'Chidi Nweke',     phone: '08023456789', email: 'chidi@gmail.com',   university: 'University of Abuja' },
    room:        'Room B03 — Single',
    block:       'Block B',
    property:    'Sunrise Hostel',
    moveIn:      'April 1, 2026',
    leaseEnd:    'March 31, 2027',
    leaseType:   '1 Year',
    amount:      120000,
    serviceFee:  8400,
    total:       128400,
    status:      'Confirmed',
    paymentStatus: 'Paid',
    paidOn:      'March 23, 2026',
    escrowStatus:'Released',
  },
  {
    id:          'BK-2026-0031',
    student:     { name: 'Fatima Bello',    phone: '08034567890', email: 'fatima@gmail.com',  university: 'University of Abuja' },
    room:        'Room C04 — Self-Contain',
    block:       'Block C',
    property:    'Sunrise Hostel',
    moveIn:      'April 5, 2026',
    leaseEnd:    'April 4, 2027',
    leaseType:   '1 Year',
    amount:      180000,
    serviceFee:  12600,
    total:       192600,
    status:      'Pending',
    paymentStatus: 'In Escrow',
    paidOn:      'March 28, 2026',
    escrowStatus:'Holding',
  },
  {
    id:          'BK-2026-0028',
    student:     { name: 'Kola Adebayo',    phone: '08045678901', email: 'kola@gmail.com',    university: 'University of Abuja' },
    room:        'Room D01 — Single',
    block:       'Block D',
    property:    'Sunrise Hostel',
    moveIn:      'March 25, 2026',
    leaseEnd:    'March 24, 2027',
    leaseType:   '1 Year',
    amount:      120000,
    serviceFee:  8400,
    total:       128400,
    status:      'Confirmed',
    paymentStatus: 'Paid',
    paidOn:      'March 18, 2026',
    escrowStatus:'Released',
  },
  {
    id:          'BK-2025-0091',
    student:     { name: 'Ngozi Okonkwo',   phone: '08056789012', email: 'ngozi@gmail.com',   university: 'University of Abuja' },
    room:        'Room A03 — Shared',
    block:       'Block A',
    property:    'Sunrise Hostel',
    moveIn:      'April 1, 2025',
    leaseEnd:    'March 31, 2026',
    leaseType:   '1 Year',
    amount:      90000,
    serviceFee:  6300,
    total:       96300,
    status:      'Expired',
    paymentStatus: 'Paid',
    paidOn:      'March 15, 2025',
    escrowStatus:'Released',
  },
]

const STATUS_CONFIG = {
  Confirmed: { badge: 'bg-green-100 text-green-700', icon: CheckCircle },
  Pending:   { badge: 'bg-amber-100 text-amber-700', icon: Clock       },
  Expired:   { badge: 'bg-gray-100 text-gray-600',   icon: XCircle     },
  Cancelled: { badge: 'bg-red-100 text-red-600',     icon: XCircle     },
}

const PAYMENT_CONFIG = {
  'Paid':       'bg-green-100 text-green-700',
  'In Escrow':  'bg-blue-100 text-blue-700',
  'Refunded':   'bg-red-100 text-red-600',
}

// ── Booking Row Component ─────────────────────────────────────

function BookingRow({ booking }) {

  const [expanded, setExpanded] = useState(false)
  const config    = STATUS_CONFIG[booking.status]
  const StatusIcon = config.icon

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

      {/* ── Main row — always visible ── */}
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">

          {/* Student avatar + info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-orange-500">
                {booking.student.name.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 truncate">
                {booking.student.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {booking.room} · {booking.block}
              </p>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${config.badge}`}>
              <StatusIcon className="w-3 h-3" />
              {booking.status}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAYMENT_CONFIG[booking.paymentStatus]}`}>
              {booking.paymentStatus}
            </span>
          </div>

          {/* Amount */}
          <div className="text-right shrink-0">
            <p className="font-bold text-gray-900">
              ₦{booking.amount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">{booking.paidOn}</p>
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
          >
            {expanded
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />
            }
          </button>

        </div>

        {/* Quick info row */}
        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            Move in: <span className="font-medium text-gray-700">{booking.moveIn}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            End: <span className="font-medium text-gray-700">{booking.leaseEnd}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="font-mono text-gray-400">{booking.id}</span>
          </div>
        </div>
      </div>

      {/* ── Expanded Details ── */}
      {expanded && (
        <div className="border-t border-gray-100 p-5 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Student contact */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Student Contact
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <User className="w-4 h-4 text-orange-500" />
                  {booking.student.name}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="w-4 h-4 text-orange-500" />
                  {booking.student.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail className="w-4 h-4 text-orange-500" />
                  {booking.student.email}
                </div>
              </div>
            </div>

            {/* Payment breakdown */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Payment Breakdown
              </p>
              <div className="bg-white rounded-xl p-3 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Room price</span>
                  <span className="font-medium">₦{booking.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Service fee (7%)</span>
                  <span className="font-medium text-gray-400">
                    -₦{booking.serviceFee.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-2">
                  <span>You receive</span>
                  <span className="text-green-600">₦{booking.amount.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Escrow: <span className="font-medium">{booking.escrowStatus}</span>
              </p>
            </div>

          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
            <button className="flex items-center gap-2 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-600 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              <Download className="w-4 h-4" />
              Download Receipt
            </button>
            {booking.status === 'Pending' && (
              <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                <CheckCircle className="w-4 h-4" />
                Confirm Move-In
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

// ── Main Component ────────────────────────────────────────────

export default function LandlordBookingsPage() {

  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('All')

  const FILTERS = ['All', 'Confirmed', 'Pending', 'Expired']

  const filtered = ALL_BOOKINGS.filter((b) => {
    const matchesSearch =
      search === '' ||
      b.student.name.toLowerCase().includes(search.toLowerCase()) ||
      b.room.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase())

    const matchesFilter = filter === 'All' || b.status === filter

    return matchesSearch && matchesFilter
  })

  const totalRevenue = ALL_BOOKINGS
    .filter((b) => b.paymentStatus === 'Paid')
    .reduce((sum, b) => sum + b.amount, 0)

  return (
    <LandlordLayout
      title="Booking Requests"
      subtitle={`${ALL_BOOKINGS.length} total bookings`}
    >
      <div className="flex flex-col gap-6">

        {/* ── Revenue summary ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Bookings',  value: ALL_BOOKINGS.length,                                                                   color: 'text-gray-900'  },
            { label: 'Confirmed',       value: ALL_BOOKINGS.filter((b) => b.status === 'Confirmed').length,                           color: 'text-green-600' },
            { label: 'Pending Escrow',  value: ALL_BOOKINGS.filter((b) => b.escrowStatus === 'Holding').length,                       color: 'text-blue-600'  },
            { label: 'Total Received',  value: `₦${(totalRevenue / 1000000).toFixed(2)}M`,                                            color: 'text-orange-500'},
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Search + Filter bar ── */}
        <div className="flex flex-col sm:flex-row gap-3">

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name, room, or booking ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
            />
          </div>

          {/* Status filters */}
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

        </div>

        {/* ── Bookings list ── */}
        {filtered.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filtered.map((booking) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-500 text-sm">
              Try adjusting your search or filter.
            </p>
          </div>
        )}

      </div>
    </LandlordLayout>
  )
}