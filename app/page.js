// app/page.jsx
// The Netlodge Homepage — public facing
// Sections: Hero, Stats, How It Works, Featured Rooms, Cities, CTA

import Link from 'next/link'
import {
  ShieldCheck,
  Search,
  CreditCard,
  Star,
  MapPin,
  Wifi,
  Zap,
  Users,
  ArrowRight,
  CheckCircle,
  Building2,
  GraduationCap,
} from 'lucide-react'

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
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-orange-100 mt-1">{stat.label}</p>
              </div>
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

          {/* Room cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredRooms.map((room) => (
              <Link
                key={room.id}
                href={`/rooms/${room.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 overflow-hidden group"
              >
                {/* Room image placeholder */}
                <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-gray-400" />
                  {/* Badge */}
                  <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${room.badgeColor}`}>
                    {room.badge}
                  </span>
                  {/* Verified shield */}
                  <div className="absolute top-3 right-3 bg-white rounded-full p-1.5 shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                  </div>
                </div>

                {/* Card body */}
                <div className="p-5">
                  {/* Location */}
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                    <MapPin className="w-3 h-3" />
                    <span>{room.university} · {room.city}</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-gray-900 mb-1 group-hover:text-orange-500 transition-colors">
                    {room.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">{room.property}</p>

                  {/* Amenity chips */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {room.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>

                  {/* Price + type */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <span className="text-xl font-bold text-gray-900">
                        ₦{room.price}
                      </span>
                      <span className="text-sm text-gray-400"> / year</span>
                    </div>
                    <span className="text-xs font-medium bg-orange-50 text-orange-600 px-3 py-1 rounded-full">
                      {room.type}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
                    <p className="text-sm text-orange-500 font-medium">{city.rooms} rooms</p>
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