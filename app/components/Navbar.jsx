// app/components/Navbar.jsx
// The main navigation bar — shown on every public page

'use client'
// 'use client' is needed because we use useState for the mobile menu toggle

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, ShieldCheck } from 'lucide-react'

export default function Navbar() {

  // Controls whether the mobile menu is open or closed
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-orange-500" />
            <span className="text-xl font-bold text-gray-900">
              Net<span className="text-orange-500">lodge</span>
            </span>
          </Link>

          {/* ── Desktop Navigation Links ── */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/search"
              className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors"
            >
              Find a Room
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/faq"
              className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* ── Desktop Auth Buttons ── */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-gray-700 hover:text-orange-500 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup/student"
              className="text-sm font-semibold bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Sign Up Free
            </Link>
          </div>

          {/* ── Mobile Menu Toggle Button ── */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {/* Show X when menu is open, hamburger when closed */}
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>
      </div>

      {/* ── Mobile Dropdown Menu ── */}
      
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-3">

          {/* Auth buttons — these aren't in bottom nav so show here */}
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              className="text-sm font-semibold text-center text-gray-700 border border-gray-200 py-3 rounded-xl"
              onClick={() => setMenuOpen(false)}
            >
              Log in
            </Link>
            <Link
              href="/signup/student"
              className="text-sm font-semibold text-center bg-orange-500 text-white py-3 rounded-xl"
              onClick={() => setMenuOpen(false)}
            >
              Sign Up Free
            </Link>
            <Link
              href="/signup/landlord"
              className="text-sm font-semibold text-center border border-orange-200 text-orange-600 py-3 rounded-xl"
              onClick={() => setMenuOpen(false)}
            >
              List Your Property
            </Link>
          </div>

        </div>
)}

    </header>
  )
}