// app/hooks/useScrollReveal.js
// Shared IntersectionObserver hook used across all public pages.
// Adds the class "revealed" to any element with class "reveal",
// "reveal-left", "reveal-right", or "reveal-stagger" when it
// enters the viewport.

'use client'

import { useEffect } from 'react'

export default function useScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll(
      '.reveal, .reveal-left, .reveal-right, .reveal-stagger'
    )

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            // Stop observing after first reveal — it only needs to happen once
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.12,      // trigger when 12% of element is visible
        rootMargin: '0px 0px -40px 0px', // slight negative bottom margin
      }
    )

    targets.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])
}
