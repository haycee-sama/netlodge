// app/components/Navbar.jsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, ShieldCheck } from 'lucide-react'
import NotificationBell from './NotificationBell'

export default function Navbar({ isLoggedIn = false, initialNotifications = null, initialUnreadCount = 0 }) {

  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-orange-500" />
            <span className="text-xl font-bold text-gray-900">
              Net<span className="text-orange-500">lodge</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/search" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">Find a Room</Link>
            <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">How It Works</Link>
            <Link href="/faq" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">FAQ</Link>
            <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">Contact</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn && (
              <NotificationBell initialNotifications={initialNotifications} initialUnreadCount={initialUnreadCount} />
            )}
            <Link href="/login" className="text-sm font-semibold text-gray-700 hover:text-orange-500 transition-colors">Log in</Link>
            <Link href="/signup/student" className="text-sm font-semibold bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">Sign Up Free</Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {isLoggedIn && (
              <NotificationBell initialNotifications={initialNotifications} initialUnreadCount={initialUnreadCount} />
            )}
            <button
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Link href="/login" className="text-sm font-semibold text-center text-gray-700 border border-gray-200 py-3 rounded-xl" onClick={() => setMenuOpen(false)}>Log in</Link>
            <Link href="/signup/student" className="text-sm font-semibold text-center bg-orange-500 text-white py-3 rounded-xl" onClick={() => setMenuOpen(false)}>Sign Up Free</Link>
            <Link href="/signup/landlord" className="text-sm font-semibold text-center border border-orange-200 text-orange-600 py-3 rounded-xl" onClick={() => setMenuOpen(false)}>List Your Property</Link>
          </div>
        </div>
      )}

    </header>
  )
}