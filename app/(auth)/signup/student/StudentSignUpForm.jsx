// app/(auth)/signup/student/StudentSignUpForm.jsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import AuthLayout from '../../../components/AuthLayout'
import { signupStudent } from '../../../../lib/actions/auth'

const YEARS = ['100 Level', '200 Level', '300 Level', '400 Level', '500 Level', 'Postgraduate']

export default function StudentSignUpForm({ universities }) {

  const router = useRouter()

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    universityName: '', course: '', year: '', password: '', confirmPassword: '',
  })

  const [errors, setErrors]             = useState({})
  const [formError, setFormError]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading]           = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    if (formError) setFormError('')
  }

  function validateClientSide() {
    const e = {}
    if (!form.firstName.trim())  e.firstName  = 'Required'
    if (!form.lastName.trim())   e.lastName   = 'Required'
    if (!form.email.trim())      e.email      = 'Required'
    if (!form.phone.trim())      e.phone      = 'Required'
    if (!form.universityName)    e.universityName = 'Please select your university'
    if (!form.course.trim())     e.course     = 'Required'
    if (!form.year)              e.year       = 'Please select your year'
    if (!form.password)          e.password   = 'Required'
    if (form.password.length < 8 && form.password)
                                 e.password   = 'Password must be at least 8 characters'
    if (form.password !== form.confirmPassword)
                                 e.confirmPassword = 'Passwords do not match'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email))
                                 e.email      = 'Enter a valid email address'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const clientErrors = validateClientSide()
    if (Object.keys(clientErrors).length > 0) { setErrors(clientErrors); return }

    setLoading(true)
    setFormError('')

    // Calls the 'use server' action directly — Next.js wraps this in a
    // same-origin-verified POST automatically (built-in CSRF protection
    // for Server Actions, no extra token handling needed here).
    const result = await signupStudent(form)

    setLoading(false)

    if ('error' in result) {
      setFormError(result.error)
      return
    }

    router.push(`/verify/email?email=${encodeURIComponent(form.email.trim().toLowerCase())}&role=student`)
  }

  function Field({ label, name, type = 'text', placeholder, required, children }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        {children || (
          <input
            type={type}
            name={name}
            value={form[name]}
            onChange={handleChange}
            placeholder={placeholder}
            className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all ${
              errors[name]
                ? 'border-red-300 focus:ring-red-100'
                : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
            }`}
          />
        )}
        {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name]}</p>}
      </div>
    )
  }

  return (
    <AuthLayout
      title="Create Your Student Account"
      subtitle="Find and book verified rooms near your university."
    >
      {formError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{formError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" name="firstName" placeholder="Amara" required />
          <Field label="Last Name"  name="lastName"  placeholder="Okonkwo" required />
        </div>

        <Field label="Email Address" name="email" type="email" placeholder="amara@gmail.com" required />
        <Field label="Phone Number" name="phone" type="tel" placeholder="08012345678" required />

        <Field label="University" name="universityName" required>
          <select
            name="universityName"
            value={form.universityName}
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-xl border text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 transition-all ${
              errors.universityName
                ? 'border-red-300 focus:ring-red-100'
                : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
            }`}
          >
            <option value="">Select your university</option>
            {universities.map((u) => (
              <option key={u.id} value={u.name}>{u.name} — {u.cityName}</option>
            ))}
          </select>
          {errors.universityName && <p className="text-xs text-red-500 mt-1">{errors.universityName}</p>}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Course / Department" name="course" placeholder="Engineering" required />
          <Field label="Year" name="year" required>
            <select
              name="year"
              value={form.year}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl border text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 transition-all ${
                errors.year
                  ? 'border-red-300 focus:ring-red-100'
                  : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
              }`}
            >
              <option value="">Select year</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {errors.year && <p className="text-xs text-red-500 mt-1">{errors.year}</p>}
          </Field>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all ${
                errors.password
                  ? 'border-red-300 focus:ring-red-100'
                  : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Confirm Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              name="confirmPassword"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all ${
                errors.confirmPassword
                  ? 'border-red-300 focus:ring-red-100'
                  : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          By creating an account you agree to Netlodge's{' '}
          <Link href="/terms" className="text-orange-500 hover:underline">Terms of Use</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link>.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 rounded-xl transition-colors text-base"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating Account...
            </>
          ) : (
            <>
              Create My Account
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-orange-500 font-semibold hover:underline">Log in</Link>
        </p>
        <p className="text-center text-xs text-gray-500">
          Are you a landlord?{' '}
          <Link href="/signup/landlord" className="text-gray-600 hover:underline">Register your property instead</Link>
        </p>

      </form>
    </AuthLayout>
  )
}