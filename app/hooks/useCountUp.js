// app/hooks/useCountUp.js
// Animates a number from 0 to `target` over `duration` ms
// using requestAnimationFrame. Only starts when the ref element
// enters the viewport (IntersectionObserver).
//
// Usage:
//   const { ref, displayValue } = useCountUp({ target: 50000, duration: 1400 })
//   <span ref={ref}>{displayValue}</span>

'use client'

import { useState, useRef, useEffect } from 'react'

export default function useCountUp({ target, duration = 1200, suffix = '' }) {
  const [displayValue, setDisplayValue] = useState('0')
  const ref = useRef(null)
  const hasStarted = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true
          observer.disconnect()
          startCount()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function startCount() {
    const startTime = performance.now()
    const isFloat = target % 1 !== 0

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = eased * target

      let formatted
      if (isFloat) {
        formatted = current.toFixed(1)
      } else if (target >= 1000) {
        formatted = Math.floor(current).toLocaleString()
      } else {
        formatted = Math.floor(current).toString()
      }

      setDisplayValue(formatted + suffix)

      if (progress < 1) {
        requestAnimationFrame(tick)
      } else {
        // Ensure final value is exact
        if (isFloat) {
          setDisplayValue(target.toFixed(1) + suffix)
        } else if (target >= 1000) {
          setDisplayValue(target.toLocaleString() + suffix)
        } else {
          setDisplayValue(target.toString() + suffix)
        }
      }
    }

    requestAnimationFrame(tick)
  }

  return { ref, displayValue }
}
