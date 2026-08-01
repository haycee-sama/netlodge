// app/(auth)/verify/email/VerifyEmailClient.jsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck, ArrowRight, AlertCircle, Mail } from 'lucide-react'
import { verifyEmailOtp, resendOtp } from '../../../../lib/actions/auth'

export default function VerifyEmailClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const role = searchParams.get('role') || 'student'

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (code.trim().length !== 6) { setError('Enter the 6-digit code.'); return }

    setLoading(true)
    setError('')
    const result = await verifyEmailOtp(email, code.trim())
    setLoading(false)

    if ('error' in result) { setError(result.error); return }

    router.push('/login?justVerified=true')
  }

  async function handleResend() {
    setError('')
    setResent(false)
    await resendOtp(email, 'email_verification')
    setResent(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <ShieldCheck className="w-6 h-6 text-orange-500" />
          <span className="text-xl font-bold text-gray-900">Net<span className="text-orange-500">lodge</span></span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Mail className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
          <p className="text-gray-500 text-sm mb-6">
            We sent a 6-digit code to <strong>{email}</strong>. Enter it below.
          </p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 text-left">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {resent && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-green-700">A new code has been sent.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} method="post" className="flex flex-col gap-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 rounded-xl transition-colors"
            >
              {loading ? 'Verifying...' : (<>Verify Email <ArrowRight className="w-5 h-5" /></>)}
            </button>
          </form>

          <button onClick={handleResend} className="text-sm text-orange-500 hover:underline mt-4">
            Didn't get a code? Resend
          </button>
        </div>
      </div>
    </div>
  )
}