// app/(auth)/forgot-password/page.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, ArrowRight } from 'lucide-react'
import { requestPasswordReset } from '../../../lib/actions/auth'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address.'); return }

    setLoading(true)
    await requestPasswordReset(email)
    setLoading(false)
    router.push(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <ShieldCheck className="w-6 h-6 text-orange-500" />
          <span className="text-xl font-bold text-gray-900">Net<span className="text-orange-500">lodge</span></span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password</h1>
          <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you a reset code.</p>

          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

          <form onSubmit={handleSubmit} method="post" className="flex flex-col gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 rounded-xl transition-colors"
            >
              {loading ? 'Sending...' : (<>Send Reset Code <ArrowRight className="w-5 h-5" /></>)}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Remembered it? <Link href="/login" className="text-orange-500 font-semibold hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}