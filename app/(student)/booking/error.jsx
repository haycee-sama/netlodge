'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Search } from 'lucide-react'

export default function BookingError({ error, reset }) {
  useEffect(() => {
    console.error('Booking flow error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Your booking hit a snag</h1>
      <p className="text-gray-500 text-sm mb-8 max-w-sm leading-relaxed">
        Something went wrong during checkout. No payment was taken. You can try
        again, or return to search and start a fresh booking.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <Link
          href="/search"
          className="flex items-center justify-center gap-2 border border-gray-200 hover:border-orange-300 text-gray-700 hover:text-orange-600 font-bold px-6 py-3 rounded-xl transition-colors"
        >
          <Search className="w-4 h-4" />
          Back to Search
        </Link>
      </div>
    </div>
  )
}
