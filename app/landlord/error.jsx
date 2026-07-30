'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'

export default function LandlordError({ error, reset }) {
  useEffect(() => {
    console.error('Landlord portal error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Dashboard error</h1>
      <p className="text-gray-500 text-sm mb-8 max-w-sm leading-relaxed">
        Something went wrong loading this page. Your property and booking data
        is safe — try again or return to your dashboard.
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
          href="/landlord/dashboard"
          className="flex items-center justify-center gap-2 border border-gray-200 hover:border-orange-300 text-gray-700 hover:text-orange-600 font-bold px-6 py-3 rounded-xl transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
