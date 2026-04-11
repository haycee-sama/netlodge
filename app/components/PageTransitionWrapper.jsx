'use client'
// app/components/PageTransitionWrapper.jsx
// Wraps page content in a div that gets the page-enter CSS animation class.
// Used in the root layout to add a fade-in on every route change.
// The animation is defined in globals.css as @keyframes pageFadeIn.

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function PageTransitionWrapper({ children }) {
  const pathname = usePathname()
  const [key, setKey] = useState(pathname)

  useEffect(() => {
    setKey(pathname)
  }, [pathname])

  return (
    <div key={key} className="page-enter">
      {children}
    </div>
  )
}
