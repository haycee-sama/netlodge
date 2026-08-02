// app/(auth)/complete-profile/CompleteProfileClient.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react'
import { completeStudentProfile } from '../../../lib/actions/profile'

const YEARS = ['100 Level', '200 Level', '300 Level', '400 Level', '500 Level', 'Postgraduate']

export default function CompleteProfileClient({ universities, email, firstName }) {
  const router = useRouter()
  const { update } = useSession()

  const [form, setForm] = useState({ universityName: '', course: '', year: '', phone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await completeStudentProfile(form)
    if ('error' in result) {
      setLoading(false)
      setError(result.error)
      return
    }

    // Force the JWT/session to refresh with the newly created
    // roleRecordId before navigating anywhere.
    await update()

    // Hard navigation instead of router.push(). router.push() uses
    // Next.js's client-side router, which can race with the session
    // cookie write from update() above — proxy.ts then reads a still-stale
    // cookie and bounces back to this page. window.location.assign forces
    // a full browser navigation, guaranteeing proxy.ts sees the fresh
    // cookie on that request.
    window.location.assign('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <ShieldCheck className="w-6 h-6 text-orange-500" />
          <span className="text-xl font-bold text-gray-900">Net<span className="text-orange-500">lodge</span></span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {firstName} 👋</h1>
          <p className="text-gray-500 text-sm mb-6">
            One last step — tell us about your school so we can find you verified rooms nearby.
          </p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} method="post" className="flex flex-col gap-4">
            <select
              name="universityName"
              value={form.universityName}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
            >
              <option value="">Select your university</option>
              {universities.map((u) => <option key={u.id} value={u.name}>{u.name} — {u.cityName}</option>)}
            </select>
            <input
              type="text" name="course" value={form.course} onChange={handleChange}
              placeholder="Course / Department"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
            />
            <select
              name="year" value={form.year} onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
            >
              <option value="">Select year</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <input
              type="tel" name="phone" value={form.phone} onChange={handleChange}
              placeholder="08012345678"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
            />
            <button
              type="submit" disabled={loading}
              className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 rounded-xl transition-colors"
            >
              {loading ? 'Saving...' : (<>Continue to Dashboard <ArrowRight className="w-5 h-5" /></>)}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}