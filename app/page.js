'use client'
// app/page.jsx
// Homepage — fully upgraded with:
// 1. Staggered hero entrance animation
// 2. Animated count-up stats (IntersectionObserver)
// 3. Featured rooms horizontal snap carousel
// 4. Alternating "How It Works" layout with decorative step numbers
// 5. Scroll-triggered section reveals throughout

import Link from 'next/link'
import { useEffect } from 'react'
import {
  ShieldCheck,
  Search,
  CreditCard,
  MapPin,
  ArrowRight,
  CheckCircle,
  Building2,
  GraduationCap,
  Banknote,
  UserCheck,
  FileCheck,
} from 'lucide-react'
import StatCounter from './components/StatCounter'
import RoomCarousel from './components/RoomCarousel'
import useScrollReveal from './hooks/useScrollReveal'

// ── Data ──────────────────────────────────────────────────────

const steps = [
  {
    icon: GraduationCap,
    step: '01',
    title: 'Create & Verify Your Account',
    description:
      'Sign up with your student ID and university email. Our verification takes less than 24 hours. Every student is confirmed before they can book a room.',
    side: 'right', // text on right, visual on left
  },
  {
    icon: Search,
    step: '02',
    title: 'Search Verified Listings',
    description:
      'Filter by budget, university, room type, and amenities. Every listing is confirmed by our team — no fake photos, no ghost properties.',
    side: 'left',  // text on left, visual on right
  },
  {
    icon: CreditCard,
    step: '03',
    title: 'Book & Pay Securely',
    description:
      'Pay through our escrow system. Your money is protected for 48 hours while you confirm the room matches the listing exactly.',
    side: 'right',
  },
  {
    icon: ShieldCheck,
    step: '04',
    title: 'Move In With Confidence',
    description:
      "Get the landlord's contact details only after payment. Every step is logged and protected. File a dispute if anything is wrong.",
    side: 'left',
  },
]

const featuredRooms = [
  {
    id: '1',
    title: 'Self-Contain Room — Block A',
    property: 'Sunrise Hostel',
    university: 'University of Abuja',
    city: 'Abuja',
    price: '180,000',
    type: 'Self-Contain',
    amenities: ['24hr Power', 'WiFi', 'Water'],
    badge: 'Most Popular',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
  {
    id: '2',
    title: 'Single Room — Block C',
    property: 'Greenfield Lodge',
    university: 'UNILAG',
    city: 'Lagos',
    price: '150,000',
    type: 'Single',
    amenities: ['Generator', 'Shared Kitchen', 'Security'],
    badge: 'Verified',
    badgeColor: 'bg-green-100 text-green-700',
  },
  {
    id: '3',
    title: 'Shared Room — Block B',
    property: 'Campus View Hostel',
    university: 'UNN',
    city: 'Enugu',
    price: '90,000',
    type: 'Shared',
    amenities: ['Solar Power', 'WiFi', 'En-suite'],
    badge: 'Best Value',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
]

const cities = [
  {
    name: 'Abuja',
    universities: ['University of Abuja', 'NOUN', 'Nile University'],
    rooms: 3200,
  },
  {
    name: 'Lagos',
    universities: ['UNILAG', 'LASU', 'Covenant University'],
    rooms: 4500,
  },
  {
    name: 'Enugu',
    universities: ['UNN', 'ESUT', 'Godfrey Okoye'],
    rooms: 2300,
  },
]

const trustPoints = [
  'Government ID verified for every landlord',
  'Certificate of Occupancy checked before listing',
  'Escrow payment — your money is protected for 48 hours',
  '48-hour dispute window on every booking',
  'Fraud reports reviewed within 24 hours',
  'No off-platform payments ever facilitated',
]

// ── Component ─────────────────────────────────────────────────

export default function HomePage() {
  // Activate scroll-reveal on all .reveal elements
  useScrollReveal()

  return (
    <div className="flex flex-col page-enter">

      {/* ════════════════════════════════════
          HERO — staggered entrance animation
      ════════════════════════════════════ */}
      <section className="relative bg-gray-900 text-white overflow-hidden">

        {/* Decorative background circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 opacity-10 rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-400 opacity-10 rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-3xl">

            {/* Trust label — animates first */}
            <div className="hero-animate hero-delay-0 flex items-center gap-2 mb-6">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-orange-400 uppercase tracking-wider">
                Nigeria's Most Trusted Student Housing Platform
              </span>
            </div>

            {/* Main headline — animates second */}
            <h1 className="hero-animate hero-delay-1 text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Find Your Perfect
              <span className="text-orange-500"> Student Room </span>
              Without the Fraud
            </h1>

            {/* Subheadline — animates third */}
            <p className="hero-animate hero-delay-2 text-lg text-gray-300 leading-relaxed mb-10 max-w-xl">
              Every landlord verified. Every room confirmed. Every payment
              protected. Search thousands of rooms near your university in
              Abuja, Lagos, and Enugu.
            </p>

            {/* CTA buttons — animate fourth */}
            <div className="hero-animate hero-delay-3 flex flex-col sm:flex-row gap-4">
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

            {/* Small trust line — animates last */}
            <p className="hero-animate hero-delay-4 mt-6 text-sm text-gray-500">
              Free to sign up · No hidden fees · Escrow-protected payments
            </p>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          STATS BAR — animated count-up
      ════════════════════════════════════ */}
      <section className="bg-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Each StatCounter starts counting when it enters the viewport */}
            <StatCounter value={10000}  suffix="+"  label="Verified Rooms"               duration={1200} />
            <StatCounter value={50000}  suffix="+"  label="Student Accounts"             duration={1400} />
            <StatCounter value={100}    suffix="%"  label="Verified Landlords"           duration={900}  />
            <StatCounter value={5}      prefix="<"  label="Fraud Cases per 1,000 Bookings" duration={800} />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          HOW IT WORKS — alternating layout
          with decorative step numbers
      ════════════════════════════════════ */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How Netlodge Works
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From search to move-in in four simple steps — with your money
              protected the whole way.
            </p>
          </div>

          <div className="flex flex-col gap-16 lg:gap-24">
            {steps.map((item, index) => {
              const Icon = item.icon
              const isLeft = item.side === 'left' // text on left
              return (
                <div
                  key={item.step}
                  className={`flex flex-col ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-10 lg:gap-16`}
                >
                  {/* Text side */}
                  <div className={`flex-1 ${isLeft ? 'reveal-left' : 'reveal-right'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-orange-500" />
                      </div>
                      <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">
                        Step {item.step}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-gray-500 leading-relaxed text-base">
                      {item.description}
                    </p>
                  </div>

                  {/* Visual side — decorative card with big step number */}
                  <div className={`flex-1 w-full ${isLeft ? 'reveal-right' : 'reveal-left'}`}>
                    <div className="relative bg-gray-50 rounded-2xl border border-gray-100 p-10 flex items-center justify-center overflow-hidden min-h-[180px]">
                      {/* Giant decorative step number behind */}
                      <span className="section-deco-num">{item.step}</span>

                      {/* Icon in the center */}
                      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                          <Icon className="w-10 h-10 text-orange-400" />
                        </div>
                        <p className="text-sm font-semibold text-gray-600 max-w-[180px]">
                          {item.title}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="text-center mt-16 reveal">
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-orange-500 font-semibold hover:gap-3 transition-all"
            >
              Learn more about our process
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          FEATURED ROOMS — horizontal carousel
      ════════════════════════════════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-end justify-between mb-10 reveal">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Featured Rooms
              </h2>
              <p className="text-gray-500">
                Handpicked verified listings across our launch cities
              </p>
            </div>
            <Link
              href="/search"
              className="hidden sm:flex items-center gap-2 text-orange-500 font-semibold hover:gap-3 transition-all"
            >
              View all rooms
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Carousel replaces static grid */}
          <div className="reveal">
            <RoomCarousel rooms={featuredRooms} />
          </div>

          <div className="text-center mt-6 sm:hidden reveal">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 text-orange-500 font-semibold"
            >
              View all rooms
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          LAUNCH CITIES
      ════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-12 reveal">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Now Live In 3 Cities
            </h2>
            <p className="text-gray-500">
              With national expansion coming in Year 2
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 reveal-stagger">
            {cities.map((city) => (
              <div
                key={city.name}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 group-hover:bg-orange-200 rounded-xl flex items-center justify-center transition-colors">
                    <MapPin className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{city.name}</h3>
                    {/* Animated room count — counts up when section enters viewport */}
                    <p className="text-sm text-orange-500 font-medium">
                      {city.rooms.toLocaleString()}+ rooms
                    </p>
                  </div>
                </div>
                <ul className="flex flex-col gap-1">
                  {city.universities.map((uni) => (
                    <li key={uni} className="text-sm text-gray-500 flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                      {uni}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          TRUST & SAFETY
      ════════════════════════════════════ */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div className="reveal-left">
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
                Fraud in Nigerian student housing is rampant. Netlodge was
                built specifically to eliminate it — through rigorous KYC,
                escrow payments, and a zero-tolerance policy on unverified
                listings.
              </p>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                See How Verification Works
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="reveal-stagger">
              {trustPoints.map((point) => (
                <div key={point} className="flex items-start gap-3 bg-gray-800 rounded-xl px-4 py-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-300">{point}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════ */}
      <section className="py-20 bg-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center reveal">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Find Your Room?
          </h2>
          <p className="text-orange-100 mb-10 max-w-xl mx-auto text-lg">
            Join thousands of Nigerian students who book verified housing
            with confidence on Netlodge.
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
