// app/(public)/page.jsx
// The Netlodge Homepage — public facing
// Sections: Hero, Stats, How It Works, Featured Rooms, Cities, CTA

import Link from 'next/link'
import {
  ShieldCheck,
  Search,
  CreditCard,
  MapPin,
  ArrowRight,
  CheckCircle,
  Building2,
  GraduationCap,
} from 'lucide-react'
import { getPropertySummaries } from '../lib/data'
import CountUpStat from './components/CountUpStat'
import FeaturedCarousel from './components/FeaturedCarousel'
import CityCoverageGrid from './components/CityCoverageGrid'

// ── Data ─────────────────────────────────────────────────────
// Keeping data outside the component keeps the JSX clean

const stats = [
  { value: '10,000+', label: 'Verified Rooms' },
  { value: '50,000+', label: 'Student Accounts' },
  { value: '100%',    label: 'Verified Landlords' },
  { value: '<5',      label: 'Fraud Cases per 1,000 Bookings' },
]

const steps = [
  {
    icon: GraduationCap,
    step: '01',
    title: 'Create & Verify Your Account',
    description:
      'Sign up with your student ID and university email. Our verification takes less than 24 hours.',
  },
  {
    icon: Search,
    step: '02',
    title: 'Search Verified Listings',
    description:
      'Filter by budget, university, room type, and amenities. Every listing is confirmed by our team.',
  },
  {
    icon: CreditCard,
    step: '03',
    title: 'Book & Pay Securely',
    description:
      'Pay through our escrow system. Your money is protected for 48 hours while you confirm the room.',
  },
  {
    icon: ShieldCheck,
    step: '04',
    title: 'Move In With Confidence',
    description:
      'Get the landlord\'s contact details only after payment. Every step is logged and protected.',
  },
]

const cities = [
  {
    name: 'Abuja',
    universities: ['University of Abuja', 'NOUN', 'Nile University'],
    rooms: '3,200+',
  },
  {
    name: 'Lagos',
    universities: ['UNILAG', 'LASU', 'Covenant University'],
    rooms: '4,500+',
  },
  {
    name: 'Enugu',
    universities: ['UNN', 'ESUT', 'Godfrey Okoye'],
    rooms: '2,300+',
  },
]

const trustPoints = [
  'Government ID verified for every landlord',
  'Certificate of Occupancy checked before listing',
  'Escrow payment — your money is protected',
  '48-hour dispute window on every booking',
  'Fraud report reviewed within 24 hours',
  'No off-platform payments ever facilitated',
]

// ── Component ────────────────────────────────────────────────

export default function HomePage() {

  // Real, bookable properties — fixes the old hardcoded array whose
  // /rooms/1, /rooms/2, /rooms/3 links didn't correspond to real rooms
  const properties = getPropertySummaries()
  const featuredProperties = properties.slice(0, 3)

  // Derive per-city room coverage from real property data for the
  // "Now Live In 3 Cities" section
  const citiesWithCoverage = cities.map((city) => {
    const cityProperties = properties.filter((p) => p.city === city.name)
    const totalRoomsInCity = cityProperties.reduce((sum, p) => sum + p.totalRooms, 0)
    const availableInCity  = cityProperties.reduce((sum, p) => sum + p.availableRooms, 0)
    const coveragePercent  = totalRoomsInCity > 0
      ? Math.round((availableInCity / totalRoomsInCity) * 100)
      : 0
    return { ...city, coveragePercent }
  })

  return (
    <div className="flex flex-col">

      {/* ════════════════════════════════════
          SECTION 1 — HERO
      ════════════════════════════════════ */}
      <section className="relative bg-gray-900 text-white overflow-hidden">

        {/* Background decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 opacity-10 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-400 opacity-10 rounded-full -translate-x-1/2 translate-y-1/2" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-3xl">

            {/* Trust label above headline */}
            <div className="flex items-center gap-2 mb-6">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-orange-400 uppercase tracking-wider">
                Nigeria's Most Trusted Student Housing Platform
              </span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Find Your Perfect
              <span className="text-orange-500"> Student Room </span>
              Without the Fraud
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-gray-300 leading-relaxed mb-10 max-w-xl">
              Every landlord verified. Every room confirmed. Every payment protected.
              Search thousands of rooms near your university in Abuja, Lagos, and Enugu.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/search"
                className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base"
              >
                <Search className="w-5 h-5" />
                Search Verified Rooms
              </Link>
              <Link
                href="/signup/landlord"
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base border border-white/20"
              >
                <Building2 className="w-5 h-5" />
                List Your Property
              </Link>
            </div>

            {/* Small trust line */}
            <p className="mt-6 text-sm text-gray-500">
              Free to sign up · No hidden fees · Escrow-protected payments
            </p>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 2 — STATS BAR
      ════════════════════════════════════ */}
      <section className="bg-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <CountUpStat key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 3 — HOW IT WORKS
      ════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section heading */}
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How Netlodge Works
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From search to move-in in four simple steps — with your money protected the whole way.
            </p>
          </div>

          {/* Steps grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.step} className="flex flex-col gap-4">
                  {/* Step number + icon */}
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-bold text-orange-100">{item.step}</span>
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-orange-500" />
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </div>
              )
            })}
          </div>

          {/* Link to full about page */}
          <div className="text-center mt-12">
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-orange-500 font-semibold hover:gap-3 transition-all"
            >
              Learn more about our process <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 4 — FEATURED ROOMS
      ════════════════════════════════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Featured Rooms
              </h2>
              <p className="text-gray-500">Handpicked verified listings across our launch cities</p>
            </div>
            <Link
              href="/search"
              className="hidden sm:flex items-center gap-2 text-orange-500 font-semibold hover:gap-3 transition-all"
            >
              View all rooms <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <FeaturedCarousel properties={featuredProperties} />

          {/* Mobile view all link */}
          <div className="text-center mt-8 sm:hidden">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 text-orange-500 font-semibold"
            >
              View all rooms <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 5 — LAUNCH CITIES
      ════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Now Live In 3 Cities
            </h2>
            <p className="text-gray-500">
              With national expansion coming in Year 2
            </p>
          </div>

          <CityCoverageGrid cities={citiesWithCoverage} />

        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 6 — TRUST & SAFETY
      ════════════════════════════════════ */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left — text */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-orange-400" />
                <span className="text-sm font-medium text-orange-400 uppercase tracking-wider">
                  Trust & Safety
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                We Verify Everything So You Don't Have To
              </h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                Fraud in Nigerian student housing is rampant. Netlodge was built specifically
                to eliminate it — through rigorous KYC, escrow payments, and a zero-tolerance
                policy on unverified listings.
              </p>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                See How Verification Works <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Right — checklist */}
            <div className="grid grid-cols-1 gap-4">
              {trustPoints.map((point) => (
                <div key={point} className="flex items-start gap-3 bg-gray-800 rounded-xl px-4 py-3">
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-300">{point}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 7 — FINAL CTA
      ════════════════════════════════════ */}
      <section className="py-20 bg-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Find Your Room?
          </h2>
          <p className="text-orange-100 mb-10 max-w-xl mx-auto text-lg">
            Join thousands of Nigerian students who book verified housing with confidence on Netlodge.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup/student"
              className="flex items-center justify-center gap-2 bg-white text-orange-600 font-bold px-8 py-4 rounded-xl hover:bg-orange-50 transition-colors text-base"
            >
              <GraduationCap className="w-5 h-5" />
              Sign Up as a Student
            </Link>
            <Link
              href="/signup/landlord"
              className="flex items-center justify-center gap-2 bg-orange-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-orange-700 transition-colors text-base border border-orange-400"
            >
              <Building2 className="w-5 h-5" />
              List Your Property
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}