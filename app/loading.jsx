// app/loading.jsx
// Global loading screen — shown automatically by Next.js
// while any page is loading or navigating

import { ShieldCheck } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6">

      {/* Animated logo */}
      <div className="relative">

        {/* Outer ring — spins */}
        <div className="w-16 h-16 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin" />

        {/* Inner logo — stays still */}
        <div className="absolute inset-0 flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-orange-500" />
        </div>

      </div>

      {/* Brand name */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-gray-900">
          Net<span className="text-orange-500">lodge</span>
        </span>
      </div>

      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>

    </div>
  )
}