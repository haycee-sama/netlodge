// app/login/page.jsx
// Login page — /login
// Handles both student and landlord login with role toggle

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, GraduationCap, Building2 } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'

export default function LoginPage() {

  const router = useRouter()

  const [role, setRole]             = useState('student') // 'student' | 'landlord'
  const [form, setForm]             = useState({ email: '', password: '' })
  const [errors, setErrors]         = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]       = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.email.trim())    e.email    = 'Please enter your email'
    if (!form.password.trim()) e.password = 'Please enter your password'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email))
                               e.email    = 'Enter a valid email address'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    // In the real app: POST /api/auth/login
    await new Promise((r) => setTimeout(r, 1500))
    // Redirect based on role
    router.push(role === 'landlord' ? '/landlord/dashboard' : '/dashboard')
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to your Netlodge account to continue."
    >
      <div className="flex flex-col gap-5">

        {/* Role toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          {[
            { value: 'student',  label: 'Student',  Icon: GraduationCap },
            { value: 'landlord', label: 'Landlord', Icon: Building2      },
          ].map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => { setRole(value); setErrors({}) }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                role === value
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                errors.email
                  ? 'border-red-300 focus:ring-red-100'
                  : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
              }`}
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs text-orange-500 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.password
                    ? 'border-red-300 focus:ring-red-100'
                    : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 rounded-xl transition-colors text-base mt-1"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                Log In as {role === 'student' ? 'Student' : 'Landlord'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

        </form>

        {/* Sign up links */}
        <div className="text-center text-sm text-gray-500">
          {role === 'student' ? (
            <>
              Don't have an account?{' '}
              <Link href="/signup/student" className="text-orange-500 font-semibold hover:underline">
                Sign up free
              </Link>
            </>
          ) : (
            <>
              Not listed yet?{' '}
              <Link href="/signup/landlord" className="text-orange-500 font-semibold hover:underline">
                Register your property
              </Link>
            </>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={() => setRole(role === 'student' ? 'landlord' : 'student')}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Switch to {role === 'student' ? 'Landlord' : 'Student'} login →
          </button>
        </div>

      </div>
    </AuthLayout>
  )
}