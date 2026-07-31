'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion, animate } from 'framer-motion'

/**
 * Parses "10,000+" / "<5" / "100%" into { prefix, number, suffix }
 * so we can animate just the numeric portion.
 */
function parseValue(raw) {
  const match = raw.match(/(-?\d+(?:\.\d+)?)/)
  if (!match) return { prefix: raw, number: null, suffix: '' }
  const number = parseFloat(match[0])
  const prefix = raw.slice(0, match.index)
  const suffix = raw.slice(match.index + match[0].length)
  return { prefix, number, suffix }
}

export default function CountUpStat({ value, label }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const shouldReduceMotion = useReducedMotion()
  const { prefix, number, suffix } = parseValue(value)
  const [display, setDisplay] = useState(shouldReduceMotion || number === null ? number ?? 0 : 0)

  useEffect(() => {
    if (!isInView || number === null) return

    if (shouldReduceMotion) {
      setDisplay(number)
      return
    }

    const controls = animate(0, number, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    })

    return () => controls.stop()
  }, [isInView, number, shouldReduceMotion])

  const formatted = number === null ? value : `${prefix}${display.toLocaleString()}${suffix}`

  return (
    <div ref={ref} className="text-center">
      {/* Visual, animating number — hidden from AT to avoid reading
          every intermediate frame as it counts up */}
      <p aria-hidden="true" className="text-3xl font-bold text-white tabular-nums">
        {formatted}
      </p>
      {/* Screen readers get the final value once, immediately, no animation noise */}
      <span className="sr-only">{value} {label}</span>
      <p aria-hidden="true" className="text-sm text-orange-100 mt-1">{label}</p>
    </div>
  )
}