// app/landlord/dashboard/page.jsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LandlordLayout from '../components/LandlordLayout'
import { auth } from '../../../lib/auth'
import { getPropertiesByLandlord } from '../../../lib/db/queries'
import {
  Building2, BedDouble, CreditCard, TrendingUp, ArrowRight, Plus, Users, Calendar, FileCheck,
} from 'lucide-react'

// Notifications/recent bookings remain static — no landlord notification
// table and no getBookingsByLandlord query exist in Phase 1 (see Phase 2
// outline). Everything below this comment that touches real data is DB-backed.
const RECENT_BOOKINGS = []
const NOTIFICATIONS = []

export default async function LandlordDashboardPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'landlord') {
    redirect('/login')
  }
  const landlordId = session.user.roleRecordId
  if (!landlordId) redirect('/landlord/kyc')

  const properties = await getPropertiesByLandlord(landlordId)

  const totalRooms = properties.reduce((sum, p) => sum + p.totalRooms, 0)
  const totalAvailable = properties.reduce((sum, p) => sum + p.availableRooms, 0)
  const totalOccupied = totalRooms - totalAvailable
  const occupancyRate = totalRooms > 0 ? Math.round((totalOccupied / totalRooms) * 100) : 0

  const STATS = [
    { label: 'Total Rooms', value: totalRooms, icon: BedDouble, color: 'text-blue-500', bg: 'bg-blue-50', sub: `${properties.length} properties` },
    { label: 'Occupied', value: totalOccupied, icon: Users, color: 'text-green-500', bg: 'bg-green-50', sub: `${occupancyRate}% occupancy rate` },
    { label: 'Available', value: totalAvailable, icon: Building2, color: 'text-orange-500', bg: 'bg-orange-50', sub: 'Ready to book' },
    { label: 'Verification', value: session.user.isEmailVerified ? 'Active' : 'Pending', icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-50', sub: 'Account status' },
  ]

  return (
    <LandlordLayout title="Dashboard" subtitle={`Welcome back, ${session.user.firstName}`}>
      <div className="flex flex-col gap-6">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
                <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900 text-lg">My Properties</h2>
                <Link href="/landlord/properties" className="text-sm text-orange-500 font-semibold hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {properties.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {properties.map((property) => {
                    const occupied = property.totalRooms - property.availableRooms
                    const occupancy = property.totalRooms > 0 ? Math.round((occupied / property.totalRooms) * 100) : 0
                    return (
                      <Link
                        key={property.id}
                        href={`/landlord/property/${property.id}/rooms`}
                        className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all group"
                      >
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                          <Building2 className="w-6 h-6 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate">{property.name}</p>
                          <p className="text-xs text-gray-500">{property.university} · {property.city}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${occupancy}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 shrink-0">{occupancy}% full</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900">{occupied}/{property.totalRooms}</p>
                          <p className="text-xs text-gray-500">occupied</p>
                          <p className="text-xs text-green-600 font-medium mt-0.5">{property.availableRooms} free</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No properties yet. Add your first one below.</p>
              )}

              <Link
                href="/landlord/property/new"
                className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-500 hover:text-orange-600 font-medium text-sm py-3 rounded-xl transition-all mt-3"
              >
                <Plus className="w-4 h-4" />
                Add New Property
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-3">Recent Bookings</h2>
              <p className="text-sm text-gray-500">
                Booking activity will appear here once students start booking your rooms.
              </p>
            </div>

          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Add New Property', href: '/landlord/property/new', icon: Plus },
                  { label: 'View Bookings', href: '/landlord/bookings', icon: Calendar },
                  { label: 'Payment History', href: '/landlord/payments', icon: CreditCard },
                  { label: 'Lease Settings', href: '/landlord/lease-config', icon: FileCheck },
                ].map((action) => {
                  const Icon = action.icon
                  return (
                    <Link key={action.label} href={action.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                      <Icon className="w-4 h-4" />
                      {action.label}
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="bg-orange-500 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5" />
                <p className="font-bold">Occupancy Rate</p>
              </div>
              <p className="text-4xl font-bold mb-1">{occupancyRate}%</p>
              <p className="text-orange-100 text-sm">{totalOccupied} of {totalRooms} rooms filled</p>
              <div className="mt-3 h-2 bg-orange-400 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${occupancyRate}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </LandlordLayout>
  )
}