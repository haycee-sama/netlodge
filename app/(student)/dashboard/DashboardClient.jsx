// app/(student)/dashboard/DashboardClient.jsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ShieldCheck, Search, BedDouble, Heart, Bell, ChevronRight, MapPin,
  Calendar, CheckCircle, Clock, AlertCircle, Building2, User, LogOut,
} from 'lucide-react'
import { signOut } from 'next-auth/react'

// Static for Phase B — no notifications table exists yet (Phase 2 concern).
const NOTIFICATIONS = [
  { id: 1, type: 'info', text: 'Welcome to Netlodge! Browse verified rooms to get started.', time: 'Just now', read: false },
]

function SidebarLink({ href, icon: Icon, label, active }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
        active ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-orange-500' : 'text-gray-500'}`} />
      {label}
    </Link>
  )
}

function NotifIcon({ type }) {
  if (type === 'success') return <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
  if (type === 'warning') return <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
  return <Bell className="w-5 h-5 text-blue-500 shrink-0" />
}

export default function DashboardClient({
  firstName, profile, activeBooking, totalBookings, savedRoomsPreview, savedRoomsCount,
}) {
  const [notifications, setNotifications] = useState(NOTIFICATIONS)
  const unreadCount = notifications.filter((n) => !n.read).length

  function markRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const daysUntilEnd = activeBooking
    ? Math.max(0, Math.round((new Date(activeBooking.leaseEndDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : null

  const QUICK_STATS = [
    { label: 'Total Bookings', value: totalBookings, icon: BedDouble, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Saved Rooms', value: savedRoomsCount, icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Days Until Lease Ends', value: daysUntilEnd ?? '—', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Verification', value: profile?.verified ? 'Verified' : 'Pending', icon: ShieldCheck, color: 'text-green-500', bg: 'bg-green-50' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky top-24">
              <div className="flex items-center gap-3 px-2 py-3 mb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-orange-500">{firstName?.charAt(0) ?? '?'}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{firstName}</p>
                  <div className="flex items-center gap-1">
                    {profile?.verified && <ShieldCheck className="w-3 h-3 text-green-500" />}
                    <p className="text-xs text-gray-500 truncate">
                      {profile?.yearLevel} · {profile?.course}
                    </p>
                  </div>
                </div>
              </div>

              <nav className="flex flex-col gap-1">
                <SidebarLink href="/dashboard" icon={BedDouble} label="Dashboard" active />
                <SidebarLink href="/search" icon={Search} label="Find a Room" active={false} />
                <SidebarLink href="/booking" icon={Calendar} label="My Bookings" active={false} />
                <SidebarLink href="/saved" icon={Heart} label="Saved Rooms" active={false} />
                <SidebarLink href="/profile" icon={User} label="Profile" active={false} />
              </nav>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Log Out
                </button>
              </div>
            </div>
          </aside>

          <main className="flex-1 flex flex-col gap-6">

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName} 👋</h1>
                <p className="text-gray-500 text-sm mt-1">{profile?.university} · {profile?.yearLevel}</p>
              </div>
              <div className="relative">
                <button className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors">
                  <Bell className="w-5 h-5 text-gray-500" />
                </button>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {QUICK_STATS.map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
                    <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {activeBooking ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-gray-900 text-lg">Active Booking</h2>
                  <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {activeBooking.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{activeBooking.roomLabel}</p>
                        <p className="text-sm text-gray-500">{activeBooking.propertyName} · {activeBooking.blockName}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {activeBooking.university} · {activeBooking.city}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 bg-gray-50 rounded-xl p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Booking Ref</span>
                        <span className="font-mono font-semibold text-gray-800 text-xs">{activeBooking.bookingRef}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Move In</span>
                        <span className="font-semibold text-gray-800">{activeBooking.moveInDate}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Lease Ends</span>
                        <span className="font-semibold text-gray-800">{activeBooking.leaseEndDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Annual Rent</p>
                      <p className="text-2xl font-bold text-gray-900">₦{activeBooking.roomPrice.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        <p className="text-xs text-orange-600 font-medium">{daysUntilEnd} days remaining on lease</p>
                      </div>
                    </div>

                    <Link
                      href="/booking"
                      className="flex items-center justify-center gap-2 border border-gray-200 hover:border-orange-300 text-gray-700 hover:text-orange-600 font-semibold py-3 rounded-xl transition-colors text-sm"
                    >
                      View Full Booking Details
                      <ChevronRight className="w-4 h-4" />
                    </Link>

                    <Link
                      href="/contact"
                      className="flex items-center justify-center gap-2 text-gray-500 hover:text-red-500 font-medium py-2 text-sm transition-colors"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Report an Issue
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
                  <BedDouble className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">No Active Booking</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-xs">
                  You have not booked a room yet. Browse thousands of verified rooms near your university.
                </p>
                <Link
                  href="/search"
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
                >
                  <Search className="w-4 h-4" />
                  Find a Room
                </Link>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900 text-lg">Saved Rooms</h2>
                <Link href="/saved" className="text-sm text-orange-500 font-semibold hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {savedRoomsPreview.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {savedRoomsPreview.map((room) => (
                    <div key={room.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{room.propertyName}</p>
                        <p className="text-xs text-gray-500">Room {room.roomNumber} · {room.roomType}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">₦{room.price.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">/year</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No saved rooms yet</p>
                  <Link href="/search" className="text-xs text-orange-500 font-medium hover:underline mt-1 inline-block">
                    Browse listings
                  </Link>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-900 text-lg">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl text-left transition-all w-full ${
                      notif.read ? 'bg-gray-50' : 'bg-orange-50 border border-orange-100'
                    }`}
                  >
                    <NotifIcon type={notif.type} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${notif.read ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>{notif.text}</p>
                      <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                    </div>
                    {!notif.read && <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0 mt-1.5" />}
                  </button>
                ))}
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
  )
}