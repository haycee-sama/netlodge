'use client'
// app/components/LeaseCountdownRing.jsx
// SVG circular progress ring showing lease health.
// The ring fills from full (lease starts) to empty (lease ends).
// Color transitions: orange → amber (< 60 days) → red (< 30 days).
//
// Props:
//   daysTotal     — total lease days (default 365)
//   daysRemaining — days left on lease
//   size          — diameter in px (default 80)

import { useEffect, useState } from 'react'

export default function LeaseCountdownRing({
  daysTotal     = 365,
  daysRemaining = 369,
  size          = 80,
}) {
  const radius      = (size - 8) / 2       // 4px stroke each side
  const circumference = 2 * Math.PI * radius  // full circle length
  const progress    = Math.max(0, Math.min(1, daysRemaining / daysTotal))
  const dashOffset  = circumference * (1 - progress)

  // Color based on urgency
  const ringColor =
    daysRemaining < 30  ? '#ef4444' :  // red
    daysRemaining < 60  ? '#f59e0b' :  // amber
    '#f97316'                           // orange (healthy)

  const textColor =
    daysRemaining < 30  ? 'text-red-500'   :
    daysRemaining < 60  ? 'text-amber-500' :
    'text-orange-500'

  // Animate on mount: offset starts at full circumference, transitions to target
  const [animatedOffset, setAnimatedOffset] = useState(circumference)

  useEffect(() => {
    // Short delay so CSS transition picks it up after mount
    const timer = setTimeout(() => setAnimatedOffset(dashOffset), 80)
    return () => clearTimeout(timer)
  }, [dashOffset])

  const displayDays = Math.max(0, daysRemaining)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-label={`${displayDays} days remaining on lease`}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="5"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.4s ease' }}
        />
      </svg>

      {/* Center text — days remaining */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold leading-none stat-number ${textColor}`} style={{ fontFamily: 'Sora, sans-serif' }}>
          {displayDays}
        </span>
        <span className="text-xs text-gray-400 leading-none mt-0.5">days</span>
      </div>
    </div>
  )
}
