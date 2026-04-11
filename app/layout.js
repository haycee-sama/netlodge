// app/layout.js
// Root layout — updated with:
// 1. PageTransitionWrapper for route fade-in transitions
// 2. Sora + DM Sans font preconnect hints
// 3. All other existing logic preserved exactly

import './globals.css'
import { headers } from 'next/headers'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import PageTransitionWrapper from './components/PageTransitionWrapper'

export const metadata = {
  title: 'Netlodge — Verified Student Housing',
  description: 'Find verified student housing near Nigerian universities.',
}

// Pages that should NOT show the public navbar or footer
const NO_CHROME_PREFIXES = [
  '/landlord',
  '/login',
  '/signup',
  '/verify',
]

// Pages that show navbar but NOT footer
const NO_FOOTER_PREFIXES = [
  '/dashboard',
  '/bookings',
  '/saved',
  '/profile',
  '/booking',
]

export default async function RootLayout({ children }) {
  const headersList = await headers()
  const pathname    = headersList.get('x-pathname') || ''

  const hideChrome = NO_CHROME_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )

  const hideFooter = NO_FOOTER_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )

  return (
    <html lang="en">
      {/* Preconnect hints for Google Fonts — reduces font load latency */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-gray-50 antialiased">

        {!hideChrome && <Navbar />}

        {/* PageTransitionWrapper re-mounts on each route change,
            triggering the page-enter CSS animation */}
        <main>
          <PageTransitionWrapper>
            {children}
          </PageTransitionWrapper>
        </main>

        {!hideChrome && !hideFooter && <Footer />}

      </body>
    </html>
  )
}
