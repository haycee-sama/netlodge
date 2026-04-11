// app/components/LandlordLayout.jsx
// Shared sidebar layout for all landlord portal pages
// Import this into every landlord dashboard page

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShieldCheck,
  LayoutDashboard,
  Building2,
  BedDouble,
  Calendar,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  FileCheck,
} from 'lucide-react'

// Navigation items for the landlord sidebar
const NAV_ITEMS = [
  {
    href:  '/landlord/dashboard',
    icon:  LayoutDashboard,
    label: 'Dashboard',
  },
  {
    href:  '/landlord/properties',
    icon:  Building2,
    label: 'My Properties',
  },
  {
    href:  '/landlord/bookings',
    icon:  Calendar,
    label: 'Booking Requests',
  },
  {
    href:  '/landlord/payments',
    icon:  CreditCard,
    label: 'Payments',
  },
  {
    href:  '/landlord/lease-config',
    icon:  FileCheck,
    label: 'Lease Config',
  },
]

// Mock landlord data
const LANDLORD = {
  name:     'Mr. Emeka Okafor',
  email:    'emeka@gmail.com',
  verified: true,
  avatar:   'E',
}

export default function LandlordLayout({ children, title, subtitle }) {

  const pathname    = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar — desktop always visible, mobile toggle ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex
      `}>

        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-white">
              Net<span className="text-orange-500">lodge</span>
            </span>
          </Link>
          {/* Close button on mobile */}
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Landlord profile */}
        <div className="px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-white">{LANDLORD.avatar}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {LANDLORD.name}
              </p>
              {LANDLORD.verified && (
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-green-400" />
                  <p className="text-xs text-green-400">Verified Landlord</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon     = item.icon
            const isActive = pathname === item.href ||
                             pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-gray-800 flex flex-col gap-1">
          <Link
            href="/landlord/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-900 hover:text-red-300 transition-colors w-full text-left">
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>

      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-20">

          {/* Mobile menu button */}
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          <div className="lg:flex-1">
            {title && (
              <div>
                <h1 className="text-lg font-bold text-gray-900">{title}</h1>
                {subtitle && (
                  <p className="text-xs text-gray-500">{subtitle}</p>
                )}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/landlord/property/new"
              className="hidden sm:flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              + Add Property
            </Link>
          </div>

        </header>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

      </div>
    </div>
  )
}