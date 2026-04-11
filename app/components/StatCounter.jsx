// app/components/StatCounter.jsx
// Renders an animated count-up number for the homepage stats strip.
// Each stat animates independently as it enters the viewport.
//
// Props:
//   value    — numeric target (e.g. 50000)
//   suffix   — string appended after number (e.g. "+", "%")
//   prefix   — string prepended before number (e.g. "<")
//   label    — descriptive text below the number
//   duration — animation duration in ms (default 1400)

'use client'

import useCountUp from '../hooks/useCountUp'

export default function StatCounter({ value, suffix = '', prefix = '', label, duration = 1400 }) {
  const { ref, displayValue } = useCountUp({ target: value, duration, suffix })

  return (
    <div className="text-center">
      <p
        ref={ref}
        className="stat-number text-3xl font-bold text-white tabular-nums"
      >
        {prefix}{displayValue}
      </p>
      <p className="text-sm text-orange-100 mt-1">{label}</p>
    </div>
  )
}
