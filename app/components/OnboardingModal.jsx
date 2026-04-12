'use client'
// app/components/OnboardingModal.jsx
// First-login onboarding modal — shown once to new students.
// 3 steps: Set preferences → How booking works → Find your room.
// Uses localStorage flag 'netlodge_onboarded' to show only once.
// Props: onClose — called when the user completes or skips onboarding.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, GraduationCap, ShieldCheck, Lock, Clock,
  CheckCircle, ArrowRight, Search, ChevronRight,
} from 'lucide-react'

// Universities list for the preference step
const UNIVERSITIES = [
  'University of Abuja', 'University of Nigeria Nsukka (UNN)',
  'University of Lagos (UNILAG)', 'Lagos State University (LASU)',
  'Enugu State University (ESUT)', 'Other',
]

// Escrow explainer steps shown in step 2
const ESCROW_STEPS = [
  { icon: Lock,         title: 'You Pay',     desc: 'Card, bank transfer, or USSD via Paystack' },
  { icon: Clock,        title: 'We Hold',     desc: 'Funds held in escrow for 48 hours'         },
  { icon: CheckCircle,  title: 'You Confirm', desc: 'Visit the room, verify it matches'          },
  { icon: ShieldCheck,  title: 'We Release',  desc: 'Funds sent to landlord after 48 hours'      },
]

export default function OnboardingModal({ onClose }) {
  const router = useRouter()
  const [step, setStep]           = useState(0)
  const [university, setUniversity] = useState('')
  const [budget, setBudget]       = useState(150000)
  const [roomType, setRoomType]   = useState('')
  const [closing, setClosing]     = useState(false)

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Keyboard: Escape closes
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  function handleClose() {
    setClosing(true)
    // Mark as onboarded in localStorage
    try { localStorage.setItem('netlodge_onboarded', '1') } catch {}
    setTimeout(onClose, 200)
  }

  function handleFinish() {
    handleClose()
    router.push('/search')
  }

  const totalSteps = 3

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0,0,0,0.55)',
        opacity: closing ? 0 : 1,
        transition: 'opacity 0.2s ease',
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="onboarding-modal bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ opacity: closing ? 0 : 1, transition: 'opacity 0.2s ease' }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-bold text-gray-900">
              Net<span className="text-orange-500">lodge</span>
            </span>
          </div>
          <button
            onClick={handleClose}
            aria-label="Skip onboarding"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Step content */}
        <div className="px-6 pt-5 pb-2" style={{ minHeight: '340px' }}>

          {/* ── Step 0: Welcome + set preferences ── */}
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Welcome to Netlodge
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Let's set up your preferences so we can show you the right rooms.
                </p>
              </div>

              {/* University */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Your university
                </label>
                <select
                  value={university}
                  onChange={e => setUniversity(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
                >
                  <option value="">Select your university</option>
                  {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              {/* Budget slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Max budget
                  </label>
                  <span className="text-sm font-bold text-orange-500">
                    ₦{budget.toLocaleString()}/yr
                  </span>
                </div>
                <input
                  type="range" min={60000} max={250000} step={10000}
                  value={budget} onChange={e => setBudget(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>₦60k</span><span>₦250k</span>
                </div>
              </div>

              {/* Room type */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Preferred room type
                </label>
                <div className="flex gap-2">
                  {['Single', 'Shared', 'Self-Contain'].map(type => (
                    <button
                      key={type} type="button"
                      onClick={() => setRoomType(type)}
                      className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                        roomType === type
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: How booking works (escrow explainer) ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Your money is always safe
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Netlodge uses escrow — we hold your payment and only release
                  it to the landlord after you confirm the room is correct.
                </p>
              </div>

              {/* Escrow flow diagram */}
              <div className="flex flex-col gap-3 mt-2">
                {ESCROW_STEPS.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={item.title} className="flex items-start gap-3">
                      {/* Step number + connector line */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-orange-500" />
                        </div>
                        {i < ESCROW_STEPS.length - 1 && (
                          <div className="w-0.5 h-4 bg-orange-100 mt-1" />
                        )}
                      </div>
                      <div className="pb-2">
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  If the room doesn't match the listing, file a dispute within
                  48 hours and receive a full refund.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 2: Ready to search ── */}
          {step === 2 && (
            <div className="flex flex-col items-center text-center gap-4 pt-4">
              <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  You're all set!
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
                  {university
                    ? `We'll show you verified rooms near ${university.split(' (')[0]} within your ₦${budget.toLocaleString()} budget.`
                    : "Browse thousands of verified rooms near your university."
                  }
                </p>
              </div>

              <div className="w-full bg-orange-50 border border-orange-100 rounded-xl p-4 text-left">
                <p className="text-xs font-semibold text-orange-700 mb-2">Your preferences saved</p>
                <div className="flex flex-col gap-1.5">
                  {university && (
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <GraduationCap className="w-3.5 h-3.5 text-orange-500" />
                      {university.split(' (')[0]}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="text-orange-500 font-bold">₦</span>
                    Up to ₦{budget.toLocaleString()} per year
                  </div>
                  {roomType && (
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <ChevronRight className="w-3.5 h-3.5 text-orange-500" />
                      {roomType} rooms preferred
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer — progress dots + CTA */}
        <div className="px-6 pb-6 pt-4">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`step-dot rounded-full transition-all ${
                  i === step
                    ? 'w-6 h-2 bg-orange-500 active'
                    : i < step
                    ? 'w-2 h-2 bg-orange-300'
                    : 'w-2 h-2 bg-gray-200'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Action button */}
          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              {step === 0 ? 'Next — How Booking Works' : 'Next — Get Started'}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              <Search className="w-4 h-4" />
              Find My First Room
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
