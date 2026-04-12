'use client'
// app/dashboard/page.jsx
// Student Dashboard — upgraded with:
// 1. One-time onboarding modal on first login
// 2. Notification bell opens a slide-down panel
// 3. Lease countdown ring replaces static "369 days" text
// 4. Notification badge bounces on new unread notifications

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ShieldCheck, Search, BedDouble, Heart, Bell,
  ChevronRight, MapPin, Calendar, CheckCircle,
  Clock, AlertCircle, Building2, ArrowRight,
  CreditCard, User, LogOut,
} from 'lucide-react'
import OnboardingModal     from '../components/OnboardingModal'
import NotificationPanel   from '../components/NotificationPanel'
import LeaseCountdownRing  from '../components/LeaseCountdownRing'

// ── Mock Data ─────────────────────────────────────────────────
const STUDENT = {
  name: 'Amara Okonkwo', university: 'University of Abuja',
  year: '200 Level', course: 'Engineering', verified: true, avatar: 'A',
}

const ACTIVE_BOOKING = {
  id: 'BK-2026-0042', room: 'Room A05 — Self-Contain',
  property: 'Sunrise Hostel', block: 'Block A',
  university: 'University of Abuja', city: 'Abuja',
  moveIn: 'April 1, 2026', leaseEnd: 'March 31, 2027',
  price: 180000, status: 'Confirmed',
  daysRemaining: 369, daysTotal: 365,
}

const SAVED_ROOMS = [
  { id: 'room-b1', propertyId: 'prop-1', title: 'Self-Contain — Block B', property: 'Sunrise Hostel',    city: 'Abuja',  price: 180000, type: 'Self-Contain' },
  { id: 'room-b3', propertyId: 'prop-2', title: 'Single Room — Block C',  property: 'Greenfield Lodge',  city: 'Lagos',  price: 150000, type: 'Single' },
]

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: 'success', text: 'Your booking for Room A05 at Sunrise Hostel has been confirmed.', time: '2 hours ago', read: false },
  { id: 2, type: 'info',    text: 'Your identity verification was approved. You can now book rooms.', time: '1 day ago',  read: true  },
  { id: 3, type: 'warning', text: 'Your lease at Sunrise Hostel expires in 369 days. Plan ahead.',   time: '3 days ago', read: true  },
]

const QUICK_STATS = [
  { label: 'Active Booking', value: '1',   icon: BedDouble,   color: 'text-orange-500', bg: 'bg-orange-50' },
  { label: 'Saved Rooms',    value: '2',   icon: Heart,       color: 'text-red-500',    bg: 'bg-red-50'    },
  { label: 'Disputes Filed', value: '0',   icon: ShieldCheck, color: 'text-green-500',  bg: 'bg-green-50'  },
  { label: 'Payments Made',  value: '1',   icon: CreditCard,  color: 'text-blue-500',   bg: 'bg-blue-50'   },
]

// ── Sidebar Nav Link ──────────────────────────────────────────
function SidebarLink({ href, icon: Icon, label, active }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
        active ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-orange-500' : 'text-gray-400'}`} />
      {label}
    </Link>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function DashboardPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [badgeBouncing, setBadgeBouncing]  = useState(false)
  const bellRef = useRef(null)

  const unreadCount = notifications.filter(n => !n.read).length

  // Show onboarding modal once per session (check localStorage)
  useEffect(() => {
    try {
      const done = localStorage.getItem('netlodge_onboarded')
      if (!done) setShowOnboarding(true)
    } catch {}
  }, [])

  // Bounce badge on mount if there are unread notifications
  useEffect(() => {
    if (unreadCount > 0) {
      setBadgeBouncing(true)
      setTimeout(() => setBadgeBouncing(false), 500)
    }
  }, [])

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function dismissNotification(id) {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  function markOneRead(id) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Onboarding modal — shown once on first visit */}
      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Sidebar ── */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky top-24">
              <div className="flex items-center gap-3 px-2 py-3 mb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-orange-500">{STUDENT.avatar}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{STUDENT.name}</p>
                  <div className="flex items-center gap-1">
                    {STUDENT.verified && <ShieldCheck className="w-3 h-3 text-green-500" />}
                    <p className="text-xs text-gray-500 truncate">{STUDENT.year} · {STUDENT.course}</p>
                  </div>
                </div>
              </div>

              <nav className="flex flex-col gap-1">
                <SidebarLink href="/dashboard" icon={BedDouble}  label="Dashboard"   active={true}  />
                <SidebarLink href="/search"    icon={Search}     label="Find a Room" active={false} />
                <SidebarLink href="/booking"   icon={Calendar}   label="My Bookings" active={false} />
                <SidebarLink href="/saved"     icon={Heart}      label="Saved Rooms" active={false} />
                <SidebarLink href="/profile"   icon={User}       label="Profile"     active={false} />
              </nav>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full">
                  <LogOut className="w-5 h-5" />
                  Log Out
                </button>
              </div>
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="flex-1 flex flex-col gap-6">

            {/* ── Header with notification bell ── */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {STUDENT.name.split(' ')[0]}
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  {STUDENT.university} · {STUDENT.year}
                </p>
              </div>

              {/* Bell with notification panel */}
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => {
                    setShowNotifPanel(v => !v)
                    // Mark first unread as read when opening
                    if (!showNotifPanel) {
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                    }
                  }}
                  className="relative w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors"
                  aria-label={`Notifications (${unreadCount} unread)`}
                >
                  <Bell className="w-5 h-5 text-gray-500" />
                  {unreadCount > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center ${badgeBouncing ? 'badge-bounce' : ''}`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification panel dropdown */}
                {showNotifPanel && (
                  <NotificationPanel
                    notifications={notifications}
                    onMarkAllRead={markAllRead}
                    onDismiss={dismissNotification}
                    onClose={() => setShowNotifPanel(false)}
                  />
                )}
              </div>
            </div>

            {/* ── Quick Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {QUICK_STATS.map(stat => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
                    <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 stat-number">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Active Booking Card — with countdown ring ── */}
            {ACTIVE_BOOKING ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-gray-900 text-lg">Active Booking</h2>
                  <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {ACTIVE_BOOKING.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Left — room info */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{ACTIVE_BOOKING.room}</p>
                        <p className="text-sm text-gray-500">{ACTIVE_BOOKING.property} · {ACTIVE_BOOKING.block}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                          <MapPin className="w-3 h-3" />
                          {ACTIVE_BOOKING.university} · {ACTIVE_BOOKING.city}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 bg-gray-50 rounded-xl p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Booking Ref</span>
                        <span className="font-mono font-semibold text-gray-800 text-xs">{ACTIVE_BOOKING.id}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Move In</span>
                        <span className="font-semibold text-gray-800">{ACTIVE_BOOKING.moveIn}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Lease Ends</span>
                        <span className="font-semibold text-gray-800">{ACTIVE_BOOKING.leaseEnd}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right — countdown ring + actions */}
                  <div className="flex flex-col gap-3">
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-3">Annual Rent</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">
                            ₦{ACTIVE_BOOKING.price.toLocaleString()}
                          </p>
                        </div>
                        {/* Lease countdown ring */}
                        <LeaseCountdownRing
                          daysRemaining={ACTIVE_BOOKING.daysRemaining}
                          daysTotal={ACTIVE_BOOKING.daysTotal}
                          size={80}
                        />
                      </div>
                      <p className="text-xs text-orange-600 font-medium mt-2 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {ACTIVE_BOOKING.daysRemaining} days remaining on lease
                      </p>
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
              /* No active booking — onboarding prompt */
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

            {/* ── Saved Rooms Preview ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900 text-lg">Saved Rooms</h2>
                <Link href="/saved" className="text-sm text-orange-500 font-semibold hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              {SAVED_ROOMS.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {SAVED_ROOMS.map(room => (
                    <Link
                      key={room.id} href={`/property/${room.propertyId}`}
                      className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all group"
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors truncate">{room.title}</p>
                        <p className="text-xs text-gray-500">{room.property} · {room.city}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">₦{room.price.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">/year</p>
                      </div>
                    </Link>
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

          </main>
        </div>
      </div>
    </div>
  )
}
