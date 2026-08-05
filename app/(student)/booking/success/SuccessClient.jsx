// app/(student)/booking/success/SuccessClient.jsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Clock, RefreshCw, AlertCircle } from 'lucide-react'
import { checkBookingStatus } from '../../../../lib/actions/booking'

const POLL_INTERVAL_MS = 4000
const MAX_POLL_ATTEMPTS = 30 // 30 attempts * 4s = 120s = 2 minutes

export default function SuccessClient({ bookingId, reference }) {
  const router = useRouter()
  const [timedOut, setTimedOut] = useState(false)
  const [checking, setChecking] = useState(false)
  const attemptsRef = useRef(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    async function poll() {
      attemptsRef.current += 1
      setChecking(true)
      const result = await checkBookingStatus(bookingId)
      setChecking(false)

      if ('error' in result) {
        return
      }

      if (result.status === 'confirmed') {
        if (intervalRef.current) clearInterval(intervalRef.current)
        router.refresh()
        return
      }

      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setTimedOut(true)
      }
    }

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [bookingId, router])

  function handleManualRefresh() {
    attemptsRef.current = 0
    setTimedOut(false)
    router.refresh()
  }

  if (timedOut) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">We could not confirm your payment yet</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          This is taking longer than expected. If money left your account, do not worry —
          your payment reference is saved and our support team can confirm it manually.
        </p>
        {reference && (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500">Payment Reference</p>
            <p className="font-mono text-sm font-semibold text-gray-800">{reference}</p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <button
            onClick={handleManualRefresh}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Check Again
          </button>
          <Link
            href="/contact"
            className="flex items-center justify-center gap-2 border border-gray-200 hover:border-orange-300 text-gray-700 hover:text-orange-600 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-center px-4">
      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center">
        <Clock className={`w-8 h-8 text-amber-500 ${checking ? 'animate-pulse' : ''}`} />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Confirming your payment...</h2>
      <p className="text-gray-500 text-sm max-w-sm">
        This usually takes a few seconds. We are checking automatically — no need to refresh the page.
      </p>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
        Checking payment status
      </div>
    </div>
  )
}