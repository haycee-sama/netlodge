// app/not-found.jsx
// Custom 404 page — shown when any URL doesn't match a route
// Next.js automatically uses this file for all 404 errors

import Link from 'next/link'
import { ShieldCheck, Home, Search, ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-12">
        <ShieldCheck className="w-6 h-6 text-orange-500" />
        <span className="text-xl font-bold text-gray-900">
          Net<span className="text-orange-500">lodge</span>
        </span>
      </Link>

      {/* 404 display */}
      <div className="text-center max-w-md">

        {/* Big number */}
        <div className="relative mb-8">
          <p className="text-[10rem] font-black text-gray-100 leading-none select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center">
              <Search className="w-10 h-10 text-orange-500" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Page Not Found
        </h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          The page you are looking for does not exist or has been moved.
          It may be a broken link or you may have typed the URL incorrectly.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Homepage
          </Link>
          <Link
            href="/search"
            className="flex items-center justify-center gap-2 border border-gray-200 hover:border-orange-300 text-gray-700 hover:text-orange-600 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            <Search className="w-4 h-4" />
            Browse Rooms
          </Link>
        </div>

        {/* Help links */}
        <div className="flex items-center justify-center gap-6 mt-8 text-sm">
          <Link href="/faq" className="text-gray-400 hover:text-orange-500 transition-colors">
            FAQ
          </Link>
          <Link href="/contact" className="text-gray-400 hover:text-orange-500 transition-colors">
            Contact Support
          </Link>
          <Link href="/about" className="text-gray-400 hover:text-orange-500 transition-colors">
            How It Works
          </Link>
        </div>

      </div>
    </div>
  )
}