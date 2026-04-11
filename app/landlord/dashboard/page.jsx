// app/landlord/dashboard/page.jsx
// Landlord Dashboard — /landlord/dashboard
// Overview of all properties, occupancy, revenue, and recent bookings

import Link from 'next/link'
import LandlordLayout from '../components/LandlordLayout'
import { getPropertySummaries } from '../../lib/data'
import {
  Building2,
  BedDouble,
  CreditCard,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Plus,
  Users,
  Eye,
  Calendar,
  FileCheck,
} from 'lucide-react'

// ── Mock dashboard data ───────────────────────────────────────
// In the real app this comes from /api/landlord/dashboard

const RECENT_BOOKINGS = [
  {
    id:        'BK-2026-0042',
    student:   'Amara Okonkwo',
    room:      'Room A05 — Self-Contain',
    property:  'Sunrise Hostel',
    amount:    192600,
    status:    'Confirmed',
    date:      'March 25, 2026',
  },
  {
    id:        'BK-2026-0039',
    student:   'Chidi Nweke',
    room:      'Room B03 — Single',
    property:  'Sunrise Hostel',
    amount:    128400,
    status:    'Confirmed',
    date:      'March 23, 2026',
  },
  {
    id:        'BK-2026-0031',
    student:   'Fatima Bello',
    room:      'Room C04 — Self-Contain',
    property:  'Sunrise Hostel',
    amount:    192600,
    status:    'Pending',
    date:      'March 20, 2026',
  },
  {
    id:        'BK-2026-0028',
    student:   'Kola Adebayo',
    room:      'Room D01 — Single',
    property:  'Sunrise Hostel',
    amount:    128400,
    status:    'Confirmed',
    date:      'March 18, 2026',
  },
]

const NOTIFICATIONS = [
  {
    id:   1,
    type: 'booking',
    text: 'New booking request for Room A05 from Amara Okonkwo',
    time: '2 hours ago',
    read: false,
  },
  {
    id:   2,
    type: 'payment',
    text: 'Payment of ₦192,600 released to your account for Room B03',
    time: '1 day ago',
    read: false,
  },
  {
    id:   3,
    type: 'info',
    text: 'Lease for Room C02 expires in 30 days — consider relisting soon',
    time: '2 days ago',
    read: true,
  },
]

// Booking status badge config
const BOOKING_STATUS = {
  Confirmed: 'bg-green-100 text-green-700',
  Pending:   'bg-amber-100 text-amber-700',
  Cancelled: 'bg-red-100 text-red-600',
}

export default function LandlordDashboardPage() {

  // Get real property data from our data file
  const properties = getPropertySummaries()

  // Calculate real stats from actual data
  const totalRooms     = properties.reduce((sum, p) => sum + p.totalRooms, 0)
  const totalAvailable = properties.reduce((sum, p) => sum + p.availableRooms, 0)
  const totalOccupied  = totalRooms - totalAvailable
  const occupancyRate  = Math.round((totalOccupied / totalRooms) * 100)

  // Mock revenue data
  const monthlyRevenue = 576000
  const totalRevenue   = 2304000

  const STATS = [
    {
      label:   'Total Rooms',
      value:   totalRooms,
      icon:    BedDouble,
      color:   'text-blue-500',
      bg:      'bg-blue-50',
      sub:     `${properties.length} properties`,
    },
    {
      label:   'Occupied',
      value:   totalOccupied,
      icon:    Users,
      color:   'text-green-500',
      bg:      'bg-green-50',
      sub:     `${occupancyRate}% occupancy rate`,
    },
    {
      label:   'Available',
      value:   totalAvailable,
      icon:    Building2,
      color:   'text-orange-500',
      bg:      'bg-orange-50',
      sub:     'Ready to book',
    },
    {
      label:   'Monthly Revenue',
      value:   `₦${(monthlyRevenue / 1000).toFixed(0)}k`,
      icon:    CreditCard,
      color:   'text-purple-500',
      bg:      'bg-purple-50',
      sub:     `₦${(totalRevenue / 1000000).toFixed(1)}M total`,
    },
  ]

  return (
    <LandlordLayout
      title="Dashboard"
      subtitle="Welcome back, Mr. Emeka"
    >
      <div className="flex flex-col gap-6">

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3"
              >
                <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ════════════════════════════════
              LEFT — Properties + Bookings
          ════════════════════════════════ */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* ── My Properties Quick View ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900 text-lg">My Properties</h2>
                <Link
                  href="/landlord/properties"
                  className="text-sm text-orange-500 font-semibold hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex flex-col gap-3">
                {properties.map((property) => {
                  const occupied    = property.totalRooms - property.availableRooms
                  const occupancy   = Math.round((occupied / property.totalRooms) * 100)
                  return (
                    <Link
                      key={property.id}
                      href={`/landlord/property/${property.id}/rooms`}
                      className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all group"
                    >
                      {/* Icon */}
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-orange-500" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                          {property.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {property.university} · {property.city}
                        </p>

                        {/* Occupancy bar */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${occupancy}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 shrink-0">
                            {occupancy}% full
                          </span>
                        </div>
                      </div>

                      {/* Room counts */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">{occupied}/{property.totalRooms}</p>
                        <p className="text-xs text-gray-400">occupied</p>
                        <p className="text-xs text-green-600 font-medium mt-0.5">
                          {property.availableRooms} free
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Add property CTA */}
              <Link
                href="/landlord/property/new"
                className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-500 hover:text-orange-600 font-medium text-sm py-3 rounded-xl transition-all mt-3"
              >
                <Plus className="w-4 h-4" />
                Add New Property
              </Link>
            </div>

            {/* ── Recent Bookings ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900 text-lg">Recent Bookings</h2>
                <Link
                  href="/landlord/bookings"
                  className="text-sm text-orange-500 font-semibold hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex flex-col gap-3">
                {RECENT_BOOKINGS.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    {/* Student avatar */}
                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-orange-500">
                        {booking.student.charAt(0)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {booking.student}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {booking.room} · {booking.date}
                      </p>
                    </div>

                    {/* Amount + status */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">
                        ₦{booking.amount.toLocaleString()}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BOOKING_STATUS[booking.status]}`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ════════════════════════════════
              RIGHT — Notifications + Quick Actions
          ════════════════════════════════ */}
          <div className="flex flex-col gap-6">

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Add New Property', href: '/landlord/property/new',    icon: Plus       },
                  { label: 'View Bookings',    href: '/landlord/bookings',        icon: Calendar   },
                  { label: 'Payment History',  href: '/landlord/payments',        icon: CreditCard },
                  { label: 'Lease Settings',   href: '/landlord/lease-config',    icon: FileCheck  },
                ].map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                      {action.label}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Notifications</h2>
                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {NOTIFICATIONS.filter((n) => !n.read).length}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {NOTIFICATIONS.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl text-left ${
                      notif.read ? 'bg-gray-50' : 'bg-orange-50 border border-orange-100'
                    }`}
                  >
                    <p className={`text-xs leading-relaxed ${
                      notif.read ? 'text-gray-500' : 'text-gray-800 font-medium'
                    }`}>
                      {notif.text}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Occupancy summary */}
            <div className="bg-orange-500 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5" />
                <p className="font-bold">Occupancy Rate</p>
              </div>
              <p className="text-4xl font-bold mb-1">{occupancyRate}%</p>
              <p className="text-orange-100 text-sm">
                {totalOccupied} of {totalRooms} rooms filled
              </p>
              <div className="mt-3 h-2 bg-orange-400 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${occupancyRate}%` }}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </LandlordLayout>
  )
}