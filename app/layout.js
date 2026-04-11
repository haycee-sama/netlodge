// app/layout.jsx
// Root layout — conditionally shows footer
// Dashboard pages use LandlordLayout which has its own sidebar
// so we hide the footer on /dashboard, /landlord/*, /bookings, etc.

import './globals.css'
import { headers } from 'next/headers'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

export const metadata = {
  title: 'Netlodge — Verified Student Housing',
  description: 'Find verified student housing near Nigerian universities.',
}

// Pages that should NOT show the public navbar or footer
// These have their own layout (LandlordLayout or are self-contained)
const NO_CHROME_PREFIXES = [
  '/landlord',
  '/login',
  '/signup',
  '/verify',
]

// Pages that show navbar but NOT footer
// (they have their own dashboard UI)
const NO_FOOTER_PREFIXES = [
  '/dashboard',
  '/bookings',
  '/saved',
  '/profile',
  '/booking',
]

export default async function RootLayout({ children }) {

  const headersList  = await headers()
  const pathname     = headersList.get('x-pathname') || ''

  // Check if this page should hide navbar + footer entirely
  const hideChrome = NO_CHROME_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )

  // Check if this page should hide only the footer
  const hideFooter = NO_FOOTER_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )

  return (
    <html lang="en">
      <body className="bg-gray-50 font-body antialiased">

        {/* Show navbar on public pages only */}
        {!hideChrome && <Navbar />}

        {/* Page content */}
        <main>
          {children}
        </main>

        {/* Show footer on public pages only, and not on student portal */}
        {!hideChrome && !hideFooter && <Footer />}

      </body>
    </html>
  )
}