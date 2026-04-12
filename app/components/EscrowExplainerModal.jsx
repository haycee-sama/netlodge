'use client'
// app/components/EscrowExplainerModal.jsx
// Small modal that explains how escrow works — triggered by a
// "What is escrow?" link on the booking confirmation page.
// Shows an animated 3-step diagram: Pay → Hold → Release / Dispute.
//
// Props:
//   onClose — function to close the modal

import { useEffect } from 'react'
import { X, CreditCard, Lock, CheckCircle, AlertCircle } from 'lucide-react'

const STEPS = [
  {
    icon:   CreditCard,
    color:  'bg-blue-50 text-blue-500',
    step:   '1',
    title:  'You Pay',
    desc:   'Your full payment is processed via Paystack. Funds go directly to the Netlodge escrow account — not to the landlord.',
  },
  {
    icon:   Lock,
    color:  'bg-orange-50 text-orange-500',
    step:   '2',
    title:  '48-Hour Hold',
    desc:   'The money stays in escrow for exactly 48 hours. This is your window to visit the room and confirm it matches the listing.',
  },
  {
    icon:   CheckCircle,
    color:  'bg-green-50 text-green-500',
    step:   '3',
    title:  'Released or Refunded',
    desc:   'No dispute? Funds are automatically released to the landlord. Filed a dispute? Funds remain frozen until our team resolves it.',
  },
]

export default function EscrowExplainerModal({ onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handler)
    }
  }, [onClose])

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="escrow-modal-content bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-orange-500" />
            <h2 className="text-base font-bold text-gray-900">How Escrow Protects You</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="px-5 pb-2">
          <div className="flex flex-col gap-0">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="flex items-start gap-3">
                  {/* Icon + connector line */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${step.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="w-0.5 h-5 bg-gray-100 my-1" />
                    )}
                  </div>
                  {/* Text */}
                  <div className="pb-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                      Step {step.step}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mb-0.5">{step.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dispute note */}
        <div className="mx-5 mb-5 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            To file a dispute, go to My Bookings → open your booking → click
            "File a Dispute". You must do this within 48 hours of payment.
          </p>
        </div>

        {/* Close button */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors text-sm"
          >
            Got it — I understand
          </button>
        </div>
      </div>
    </div>
  )
}
