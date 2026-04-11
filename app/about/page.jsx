'use client'
// app/about/page.jsx
// About / How It Works page — upgraded with:
// 1. Scroll-triggered section reveals (fade-up, left, right)
// 2. Problem/Solution columns animate in from opposite directions
// 3. Escrow timeline lights up steps sequentially on scroll
// 4. Student & landlord step cards stagger in on scroll

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import {
  ShieldCheck,
  Search,
  CreditCard,
  FileCheck,
  UserCheck,
  Building2,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  Lock,
  GraduationCap,
  Banknote,
} from 'lucide-react'
import useScrollReveal from '../hooks/useScrollReveal'

// ── Data ──────────────────────────────────────────────────────

const studentSteps = [
  {
    step: '01',
    icon: GraduationCap,
    title: 'Create Your Account',
    description:
      'Sign up with your name, university, course, and year. We send an OTP to your phone number to confirm it is really you.',
  },
  {
    step: '02',
    icon: UserCheck,
    title: 'Verify Your Identity',
    description:
      'Upload your student ID or admission letter and enter your NIN or BVN. Our system checks your identity automatically within 24 hours.',
  },
  {
    step: '03',
    icon: Search,
    title: 'Search Verified Listings',
    description:
      'Browse properties near your university. Filter by budget, room type, and amenities. Every property has been manually verified.',
  },
  {
    step: '04',
    icon: Building2,
    title: 'Browse Rooms Inside a Property',
    description:
      'Click a property to see all blocks and available rooms. View photos, amenities, floor, bathroom type, and exact pricing per room.',
  },
  {
    step: '05',
    icon: CreditCard,
    title: 'Pay Through Escrow',
    description:
      'Pay securely online — card, bank transfer, or USSD. Your money is held in escrow for 48 hours before being released to the landlord.',
  },
  {
    step: '06',
    icon: ShieldCheck,
    title: 'Move In With Confidence',
    description:
      "After payment your booking is confirmed, the room is reserved, and the landlord's contact details are revealed. File a dispute within 48 hours if anything is wrong.",
  },
]

const landlordSteps = [
  {
    step: '01',
    icon: UserCheck,
    title: 'Register & Submit KYC',
    description:
      'Create your landlord account and upload your government ID and Certificate of Occupancy or deed of assignment for your property.',
  },
  {
    step: '02',
    icon: FileCheck,
    title: 'Manual Verification (48hrs)',
    description:
      'Our admin team reviews your documents within 48 hours. We check ID authenticity, property ownership, and geo-tagged property photos.',
  },
  {
    step: '03',
    icon: Building2,
    title: 'Create Your Property',
    description:
      'Once verified, set up your property with blocks and individual rooms. Upload minimum 5 photos per room, set prices, and configure lease options.',
  },
  {
    step: '04',
    icon: Banknote,
    title: 'Receive Bookings & Payments',
    description:
      'Students book directly through Netlodge. Funds are released to your registered bank account automatically after the 48-hour escrow window closes.',
  },
]

const fraudProblems = [
  'Agents collecting rent for properties they do not own',
  'Fake listings with stolen photos from real properties',
  'Students losing money with no way to get it back',
  'No way to verify if a landlord actually owns a property',
  'Rooms that look nothing like their advertised photos',
  'Agents disappearing after collecting payment',
]

const netlodgeSolutions = [
  'Every landlord submits government ID and property documents before listing',
  'All property documents are manually reviewed by our admin team',
  'Escrow payment holds your money for 48 hours — giving you time to verify',
  'You can file a dispute if the room does not match and get a full refund',
  'No off-platform payments ever facilitated or encouraged',
  'Agents must be independently verified and linked to specific landlords',
]

// The four escrow steps — each lights up sequentially on scroll
const escrowSteps = [
  {
    icon: CreditCard,
    title: 'You Pay Online',
    description: 'Card, bank transfer, or USSD through our secure Paystack gateway.',
    index: 0,
  },
  {
    icon: Lock,
    title: 'Funds Held in Escrow',
    description: "Money sits in our protected escrow account — not with the landlord yet.",
    index: 1,
  },
  {
    icon: Clock,
    title: '48-Hour Window',
    description: 'You have 48 hours to visit the room and confirm it matches the listing.',
    index: 2,
  },
  {
    icon: CheckCircle,
    title: 'Funds Released',
    description: 'If no dispute is filed, funds are automatically released to the landlord.',
    index: 3,
  },
]

// ── Escrow timeline with sequential light-up ─────────────────

function EscrowTimeline() {
  const sectionRef = useRef(null)
  const stepsRef   = useRef([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Light up each step with a staggered delay
          stepsRef.current.forEach((el, i) => {
            if (!el) return
            setTimeout(() => {
              el.classList.add('lit')
            }, i * 220)
          })
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={sectionRef} className="relative">
      {/* Connecting line — desktop horizontal, mobile hidden */}
      <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-blue-100 z-0" style={{ top: '3rem' }} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {escrowSteps.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.title}
              ref={(el) => (stepsRef.current[item.index] = el)}
              className="escrow-step bg-white rounded-2xl border border-blue-100 p-6 flex flex-col gap-3"
              style={{ animationDelay: `${item.index * 220}ms` }}
            >
              {/* Step dot on the connector line */}
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center escrow-dot transition-all duration-300">
                <Icon className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-bold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────

export default function AboutPage() {
  useScrollReveal()

  return (
    <div className="min-h-screen bg-white page-enter">

      {/* ── HERO ── */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl hero-animate hero-delay-0">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-orange-400 uppercase tracking-wider">
                How Netlodge Works
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Built to Eliminate
              <span className="text-orange-500"> Student Housing Fraud </span>
              in Nigeria
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed">
              Netlodge was created because Nigerian university students deserve better.
              Every feature — from KYC verification to escrow payment — exists specifically
              to protect students and landlords from the fraud that has plagued off-campus
              housing for decades.
            </p>
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM / SOLUTION ── */}
      {/* Left column reveals from left, right column reveals from right */}
      <section className="py-20 bg-red-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Problem list — slides in from left */}
            <div className="reveal-left">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-semibold text-red-500 uppercase tracking-wider">
                  The Problem
                </span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                What Students Face Without Netlodge
              </h2>
              <ul className="flex flex-col gap-3">
                {fraudProblems.map((problem) => (
                  <li
                    key={problem}
                    className="flex items-start gap-3 bg-white border border-red-100 rounded-xl px-4 py-3"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{problem}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Solution list — slides in from right */}
            <div className="reveal-right">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <span className="text-sm font-semibold text-green-600 uppercase tracking-wider">
                  The Netlodge Solution
                </span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                How We Fix Every Problem
              </h2>
              <ul className="flex flex-col gap-3">
                {netlodgeSolutions.map((solution) => (
                  <li
                    key={solution}
                    className="flex items-start gap-3 bg-white border border-green-100 rounded-xl px-4 py-3"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{solution}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── STUDENT JOURNEY — staggered cards ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-14 reveal">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works for Students
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From signup to move-in — six simple steps with your money protected the whole way.
            </p>
          </div>

          {/* Steps stagger in as a group when section enters viewport */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 reveal-stagger">
            {studentSteps.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="bg-gray-50 rounded-2xl border border-gray-100 p-6 flex flex-col gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-orange-100 font-display">{item.step}</span>
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-orange-500" />
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </div>
              )
            })}
          </div>

          <div className="text-center mt-10 reveal">
            <Link
              href="/signup/student"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl transition-colors"
            >
              Get Started as a Student
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* ── ESCROW EXPLAINED — sequential light-up timeline ── */}
      <section className="py-20 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-14 reveal">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Lock className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-semibold text-blue-500 uppercase tracking-wider">
                Escrow Payment
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Your Money Is Always Protected
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              We never send your money directly to the landlord. It goes through
              our escrow system first — giving you time to verify the room is real.
            </p>
          </div>

          {/* Sequential light-up timeline */}
          <EscrowTimeline />

        </div>
      </section>

      {/* ── LANDLORD JOURNEY — staggered cards ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-14 reveal">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works for Landlords
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Get verified, list your property, and start receiving direct bookings
              with guaranteed payments — no agents needed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 reveal-stagger">
            {landlordSteps.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="bg-gray-50 rounded-2xl border border-gray-100 p-6 flex flex-col gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-orange-100">{item.step}</span>
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-orange-500" />
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </div>
              )
            })}
          </div>

          <div className="text-center mt-10 reveal">
            <Link
              href="/signup/landlord"
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold px-8 py-4 rounded-xl transition-colors"
            >
              List Your Property
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 bg-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center reveal">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Experience Safe Student Housing?
          </h2>
          <p className="text-orange-100 mb-10 max-w-xl mx-auto">
            Join thousands of Nigerian students booking verified rooms with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup/student"
              className="flex items-center justify-center gap-2 bg-white text-orange-600 font-bold px-8 py-4 rounded-xl hover:bg-orange-50 transition-colors"
            >
              <GraduationCap className="w-5 h-5" />
              Sign Up as a Student
            </Link>
            <Link
              href="/search"
              className="flex items-center justify-center gap-2 bg-orange-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-orange-700 transition-colors border border-orange-400"
            >
              <Search className="w-5 h-5" />
              Browse Verified Rooms
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
