// app/(auth)/login/page.jsx
'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, GraduationCap, Building2, AlertCircle, CheckCircle } from 'lucide-react'
import AuthLayout from '../../components/AuthLayout'

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 015.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 001 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 002.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')
  const justVerified = searchParams.get('justVerified') === 'true'
  const passwordReset = searchParams.get('passwordReset') === 'true'

  const [role, setRole] = useState('student')
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    if (formError) setFormError('')
  }

  function validate() {
    const e = {}
    if (!form.email.trim()) e.email = 'Please enter your email'
    if (!form.password.trim()) e.password = 'Please enter your password'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setFormError('')

    const result = await signIn('credentials', {
      email: form.email.trim().toLowerCase(),
      password: form.password,
      redirect: false,
    })

    setLoading(false)

    if (!result || result.error) {
      setFormError('Invalid email or password.')
      return
    }

    const destination = callbackUrl || (role === 'landlord' ? '/landlord/dashboard' : '/dashboard')
    router.push(destination)
    router.refresh()
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your Netlodge account to continue.">
      <div className="flex flex-col gap-5">

        <div className="flex bg-gray-100 rounded-xl p-1">
          {[
            { value: 'student', label: 'Student', Icon: GraduationCap },
            { value: 'landlord', label: 'Landlord', Icon: Building2 },
          ].map(({ value, label, Icon }) => (
            <button
              key={value} type="button"
              onClick={() => { setRole(value); setFormError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                role === value ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {justVerified && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <p className="text-sm text-green-700">Email verified! Log in to continue.</p>
          </div>
        )}
        {passwordReset && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <p className="text-sm text-green-700">Password reset. Log in with your new password.</p>
          </div>
        )}
        {formError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{formError}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3.5 rounded-xl transition-colors text-sm"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleSubmit} method="post" className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input
              type="email" name="email" autoComplete="email"
              value={form.email} onChange={handleChange} placeholder="your@email.com"
              className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all ${
                errors.email ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
              }`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Link href="/forgot-password" className="text-xs text-orange-500 hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password"
                value={form.password} onChange={handleChange} placeholder="Enter your password"
                className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all ${
                  errors.password ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
                }`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          <button
            type="submit" disabled={loading}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 rounded-xl transition-colors text-base mt-1"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Logging in...</>
            ) : (
              <>Log In as {role === 'student' ? 'Student' : 'Landlord'} <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </form>

        <div className="text-center text-sm text-gray-500">
          {role === 'student' ? (
            <>Don't have an account? <Link href="/signup/student" className="text-orange-500 font-semibold hover:underline">Sign up free</Link></>
          ) : (
            <>Not listed yet? <Link href="/signup/landlord" className="text-orange-500 font-semibold hover:underline">Register your property</Link></>
          )}
        </div>

        <div className="text-center">
          <button type="button" onClick={() => setRole(role === 'student' ? 'landlord' : 'student')} className="text-xs text-gray-500 hover:text-gray-600 transition-colors">
            Switch to {role === 'student' ? 'Landlord' : 'Student'} login →
          </button>
        </div>

      </div>
    </AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}