// app/signup/student/page.jsx
// Student registration page — /signup/student
// Collects name, university, course, year, phone, email, password
// On submit redirects to verification page

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import AuthLayout from '../../components/AuthLayout'

// List of universities for the dropdown
const UNIVERSITIES = [
  'University of Abuja',
  'University of Nigeria Nsukka (UNN)',
  'University of Lagos (UNILAG)',
  'Lagos State University (LASU)',
  'Enugu State University (ESUT)',
  'Nile University of Nigeria',
  'Covenant University',
  'Godfrey Okoye University',
  'Other',
]

const YEARS = ['100 Level', '200 Level', '300 Level', '400 Level', '500 Level', 'Postgraduate']

export default function StudentSignUpPage() {

  const router = useRouter()

  // All form fields in one state object
  const [form, setForm] = useState({
    firstName:  '',
    lastName:   '',
    email:      '',
    phone:      '',
    university: '',
    course:     '',
    year:       '',
    password:   '',
    confirm:    '',
  })

  const [errors, setErrors]         = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading]           = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.firstName.trim())  e.firstName  = 'Required'
    if (!form.lastName.trim())   e.lastName   = 'Required'
    if (!form.email.trim())      e.email      = 'Required'
    if (!form.phone.trim())      e.phone      = 'Required'
    if (!form.university)        e.university = 'Please select your university'
    if (!form.course.trim())     e.course     = 'Required'
    if (!form.year)              e.year       = 'Please select your year'
    if (!form.password)          e.password   = 'Required'
    if (form.password.length < 8 && form.password)
                                 e.password   = 'Password must be at least 8 characters'
    if (form.password !== form.confirm)
                                 e.confirm    = 'Passwords do not match'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email))
                                 e.email      = 'Enter a valid email address'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)

    // Simulate API call delay
    // In the real app: POST to /api/auth/signup with form data
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Redirect to verification page after successful signup
    router.push('/verify/student')
  }

  // Reusable input field component defined inline
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
            className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
              errors[name]
                ? 'border-red-300 focus:ring-red-100'
                : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
            }`}
          />
        )}
        {errors[name] && (
          <p className="text-xs text-red-500 mt-1">{errors[name]}</p>
        )}
      </div>
    )
  }

  return (
    <AuthLayout
      title="Create Your Student Account"
      subtitle="Find and book verified rooms near your university."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" name="firstName" placeholder="Amara" required />
          <Field label="Last Name"  name="lastName"  placeholder="Okonkwo" required />
        </div>

        {/* Email */}
        <Field label="Email Address" name="email" type="email" placeholder="amara@gmail.com" required />

        {/* Phone */}
        <Field label="Phone Number" name="phone" type="tel" placeholder="08012345678" required />

        {/* University */}
        <Field label="University" name="university" required>
          <select
            name="university"
            value={form.university}
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-xl border text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 transition-all ${
              errors.university
                ? 'border-red-300 focus:ring-red-100'
                : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
            }`}
          >
            <option value="">Select your university</option>
            {UNIVERSITIES.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          {errors.university && (
            <p className="text-xs text-red-500 mt-1">{errors.university}</p>
          )}
        </Field>

        {/* Course + Year row */}
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
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {errors.year && (
              <p className="text-xs text-red-500 mt-1">{errors.year}</p>
            )}
          </Field>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
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

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Confirm Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              placeholder="Repeat your password"
              className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                errors.confirm
                  ? 'border-red-300 focus:ring-red-100'
                  : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirm && (
            <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>
          )}
        </div>

        {/* Terms notice */}
        <p className="text-xs text-gray-400 leading-relaxed">
          By creating an account you agree to Netlodge's{' '}
          <Link href="/terms" className="text-orange-500 hover:underline">Terms of Use</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link>.
        </p>

        {/* Submit */}
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

        {/* Login link */}
        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-orange-500 font-semibold hover:underline">
            Log in
          </Link>
        </p>

        {/* Landlord link */}
        <p className="text-center text-xs text-gray-400">
          Are you a landlord?{' '}
          <Link href="/signup/landlord" className="text-gray-600 hover:underline">
            Register your property instead
          </Link>
        </p>

      </form>
    </AuthLayout>
  )
}