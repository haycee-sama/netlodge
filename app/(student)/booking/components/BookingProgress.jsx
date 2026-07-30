import { CheckCircle } from 'lucide-react'

const STEPS = ['Review & Confirm', 'Payment', 'Booking Complete']

/**
 * Shared progress indicator for the booking flow.
 * `step` is 0-indexed: 0 = Review & Confirm, 1 = Payment, 2 = Complete.
 */
export default function BookingProgress({ step }) {
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-2">
          {STEPS.map((label, index) => {
            const isActive   = index === step
            const isComplete = index < step

            return (
              <div key={label} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isComplete
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isComplete ? <CheckCircle className="w-4 h-4" /> : index + 1}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:block ${
                      isActive ? 'text-orange-500' : isComplete ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 w-8 sm:w-16 ${isComplete ? 'bg-green-500' : 'bg-gray-100'}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}