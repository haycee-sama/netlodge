// app/components/Footer.jsx
// Responsive footer with three breakpoint behaviours:
// Mobile  — bottom navigation bar (fixed, app-like)
// Tablet  — simple single row footer
// Desktop — full 4-column detailed footer

import Link from 'next/link'
import {
  ShieldCheck,
  Home,
  Search,
  Info,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Building2,
  HelpCircle,
} from 'lucide-react'

// ── Mobile bottom nav items ───────────────────────────────────
const MOBILE_NAV = [
  { href: '/',       icon: Home,         label: 'Home'    },
  { href: '/search', icon: Search,       label: 'Search'  },
  { href: '/about',  icon: Info,         label: 'About'   },
  { href: '/faq',    icon: HelpCircle,   label: 'FAQ'     },
  { href: '/contact',icon: Phone,        label: 'Contact' },
]

export default function Footer() {
  return (
    <>

      {/* ══════════════════════════════════════
          MOBILE — Fixed bottom nav bar
          Visible only on small screens (< md)
      ══════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg">
        <div className="flex items-stretch">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-gray-500 hover:text-orange-500 active:text-orange-600 transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
        {/* Safe area spacer for phones with home bar */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </nav>

      {/* Bottom padding on mobile so content doesn't hide behind nav */}
      <div className="md:hidden h-16" />

      {/* ══════════════════════════════════════
          TABLET — Simple single-row footer
          Visible only on md screens
      ══════════════════════════════════════ */}
      <footer className="hidden md:block lg:hidden bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-500" />
              <span className="font-bold text-white">
                Net<span className="text-orange-500">lodge</span>
              </span>
            </Link>

            {/* Quick links */}
            <div className="flex items-center gap-6 text-sm">
              <Link href="/search"  className="hover:text-orange-400 transition-colors">Find a Room</Link>
              <Link href="/about"   className="hover:text-orange-400 transition-colors">How It Works</Link>
              <Link href="/faq"     className="hover:text-orange-400 transition-colors">FAQ</Link>
              <Link href="/contact" className="hover:text-orange-400 transition-colors">Contact</Link>
            </div>

            {/* Copyright */}
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} Netlodge
            </p>

          </div>
        </div>
      </footer>

      {/* ══════════════════════════════════════
          DESKTOP — Full 4-column footer
          Visible only on lg+ screens
      ══════════════════════════════════════ */}
      <footer className="hidden lg:block bg-gray-900 text-gray-400 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-8">

          {/* 4 columns */}
          <div className="grid grid-cols-4 gap-10 pb-12 border-b border-gray-800">

            {/* Column 1 — Brand */}
            <div className="flex flex-col gap-4">
              <Link href="/" className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-orange-500" />
                <span className="text-xl font-bold text-white">
                  Net<span className="text-orange-500">lodge</span>
                </span>
              </Link>
              <p className="text-sm leading-relaxed">
                Nigeria's most trusted student housing platform.
                Every landlord verified. Every payment protected.
              </p>
              <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 w-fit">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400 font-medium">Verified Platform</span>
              </div>
            </div>

            {/* Column 2 — Students */}
            <div className="flex flex-col gap-3">
              <h4 className="text-white font-semibold text-sm uppercase tracking-wider">
                For Students
              </h4>
              {[
                { href: '/search',         label: 'Find a Room'          },
                { href: '/signup/student', label: 'Create Account'        },
                { href: '/about',          label: 'How Booking Works'     },
                { href: '/faq',            label: 'FAQs'                  },
                { href: '/contact',        label: 'Get Support'           },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm hover:text-orange-400 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Column 3 — Landlords */}
            <div className="flex flex-col gap-3">
              <h4 className="text-white font-semibold text-sm uppercase tracking-wider">
                For Landlords
              </h4>
              {[
                { href: '/signup/landlord', label: 'List Your Property'      },
                { href: '/about',           label: 'How Verification Works'  },
                { href: '/faq',             label: 'Landlord FAQs'           },
                { href: '/contact',         label: 'Contact Us'              },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm hover:text-orange-400 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Column 4 — Contact */}
            <div className="flex flex-col gap-3">
              <h4 className="text-white font-semibold text-sm uppercase tracking-wider">
                Contact
              </h4>
              <div className="flex items-start gap-2 text-sm">
                <Mail className="w-4 h-4 mt-0.5 shrink-0 text-orange-500" />
                <span>hello@netlodge.ng</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Phone className="w-4 h-4 mt-0.5 shrink-0 text-orange-500" />
                <span>+234 800 000 0000</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-orange-500" />
                <span>Abuja · Lagos · Enugu</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {['Abuja', 'Lagos', 'Enugu'].map((city) => (
                  <span
                    key={city}
                    className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full"
                  >
                    {city}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom row */}
          <div className="pt-8 flex items-center justify-between gap-4">
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} Netlodge. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-xs hover:text-orange-400 transition-colors">Privacy Policy</Link>
              <Link href="/terms"   className="text-xs hover:text-orange-400 transition-colors">Terms of Use</Link>
              <Link href="/contact" className="text-xs hover:text-orange-400 transition-colors">Support</Link>
            </div>
          </div>

        </div>
      </footer>

    </>
  )
}