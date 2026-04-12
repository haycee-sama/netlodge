'use client'
// app/signup/student/page.jsx
// Student registration — upgraded with:
// 1. Real-time inline validation on field blur (green check / red error)
// 2. Password strength bar that fills as the user types
// 3. Animated checkmark that pops in when a field passes validation
// 4. All original fields and flow preserved

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, CheckCircle, XCircle } from 'lucide-react'
import AuthLayout from '../../components/AuthLayout'

// ── University / year data ────────────────────────────────────
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

// ── Password strength calculator ─────────────────────────────
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const levels = [
    { min: 0, label: '',          color: 'bg-gray-200', width: '0%'   },
    { min: 1, label: 'Weak',      color: 'bg-red-400',  width: '20%'  },
    { min: 2, label: 'Fair',      color: 'bg-orange-400', width: '40%' },
    { min: 3, label: 'Good',      color: 'bg-yellow-400', width: '60%' },
    { min: 4, label: 'Strong',    color: 'bg-green-400', width: '80%'  },
    { min: 5, label: 'Very strong', color: 'bg-green-500', width: '100%' },
  ]
  const level = levels.filter(l => score >= l.min).pop()
  return { score, ...level }
}

// ── Per-field validators ──────────────────────────────────────
const validators = {
  firstName:  (v) => v.trim().length >= 1   ? null : 'Required',
  lastName:   (v) => v.trim().length >= 1   ? null : 'Required',
  email:      (v) => /\S+@\S+\.\S+/.test(v) ? null : 'Enter a valid email address',
  phone:      (v) => v.trim().length >= 10  ? null : 'Enter a valid phone number',
  university: (v) => v.length > 0           ? null : 'Please select your university',
  course:     (v) => v.trim().length >= 1   ? null : 'Required',
  year:       (v) => v.length > 0           ? null : 'Please select your year',
  password:   (v) => v.length >= 8          ? null : 'Password must be at least 8 characters',
  confirm:    (v, form) => v === form.password ? null : 'Passwords do not match',
}

// ── Validated Field Component ─────────────────────────────────
// Shows a green check or red X icon on the right of a field after blur
function FieldStatus({ touched, error, value }) {
  if (!touched || !value) return null
  if (error) return <XCircle className="w-4 h-4 text-red-400 shrink-0" />
  return (
    <CheckCircle
      className="w-4 h-4 text-green-500 shrink-0 field-check"
      style={{ animation: 'checkmarkPop 0.18s ease-out forwards' }}
    />
  )
}

// ── Main Component ────────────────────────────────────────────
export default function StudentSignUpPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    university: '', course: '', year: '', password: '', confirm: '',
  })

  // touched tracks which fields have been blurred at least once
  const [touched, setTouched]           = useState({})
  const [errors, setErrors]             = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading]           = useState(false)

  const strength = getPasswordStrength(form.password)

  // Validate a single field and update errors state
  const validateField = useCallback((name, value) => {
    const validator = validators[name]
    if (!validator) return
    const error = validator(value, form)
    setErrors(prev => ({ ...prev, [name]: error }))
  }, [form])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    // Re-validate on change if field was already touched
    if (touched[name]) validateField(name, value)
    // If changing password, re-validate confirm too
    if (name === 'password' && touched.confirm) {
      const confirmError = form.confirm !== value ? 'Passwords do not match' : null
      setErrors(prev => ({ ...prev, confirm: confirmError }))
    }
  }

  function handleBlur(e) {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    validateField(name, value)
  }

  // Full validation on submit
  function validateAll() {
    const e = {}
    Object.keys(validators).forEach(name => {
      const error = validators[name](form[name], form)
      if (error) e[name] = error
    })
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    // Mark all as touched so errors show
    const allTouched = Object.keys(form).reduce((acc, k) => ({ ...acc, [k]: true }), {})
    setTouched(allTouched)
    const errs = validateAll()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    router.push('/verify/student')
  }

  // Input class — orange focus ring, red border on error
  const inputClass = (name) => `
    w-full px-4 py-3 rounded-xl border text-sm text-gray-800
    placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all
    ${errors[name] && touched[name]
      ? 'border-red-300 focus:ring-red-100'
      : touched[name] && !errors[name] && form[name]
        ? 'border-green-300 focus:ring-green-100 focus:border-green-400'
        : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
    }
  `

  return (
    <AuthLayout
      title="Create Your Student Account"
      subtitle="Find and book verified rooms near your university."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          {['firstName', 'lastName'].map(field => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {field === 'firstName' ? 'First Name' : 'Last Name'}
                <span className="text-red-400"> *</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  name={field}
                  value={form[field]}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={field === 'firstName' ? 'Amara' : 'Okonkwo'}
                  className={inputClass(field) + ' pr-9'}
                />
                <div className="absolute right-3">
                  <FieldStatus touched={touched[field]} error={errors[field]} value={form[field]} />
                </div>
              </div>
              {touched[field] && errors[field] && (
                <p className="text-xs text-red-500 mt-1">{errors[field]}</p>
              )}
            </div>
          ))}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email Address <span className="text-red-400">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="email" name="email" value={form.email}
              onChange={handleChange} onBlur={handleBlur}
              placeholder="amara@gmail.com"
              className={inputClass('email') + ' pr-9'}
            />
            <div className="absolute right-3">
              <FieldStatus touched={touched.email} error={errors.email} value={form.email} />
            </div>
          </div>
          {touched.email && errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone Number <span className="text-red-400">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="tel" name="phone" value={form.phone}
              onChange={handleChange} onBlur={handleBlur}
              placeholder="08012345678"
              className={inputClass('phone') + ' pr-9'}
            />
            <div className="absolute right-3">
              <FieldStatus touched={touched.phone} error={errors.phone} value={form.phone} />
            </div>
          </div>
          {touched.phone && errors.phone && (
            <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
          )}
        </div>

        {/* University */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            University <span className="text-red-400">*</span>
          </label>
          <select
            name="university" value={form.university}
            onChange={handleChange} onBlur={handleBlur}
            className={inputClass('university') + ' bg-white'}
          >
            <option value="">Select your university</option>
            {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          {touched.university && errors.university && (
            <p className="text-xs text-red-500 mt-1">{errors.university}</p>
          )}
        </div>

        {/* Course + Year row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Course / Department <span className="text-red-400">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="text" name="course" value={form.course}
                onChange={handleChange} onBlur={handleBlur}
                placeholder="Engineering"
                className={inputClass('course') + ' pr-9'}
              />
              <div className="absolute right-3">
                <FieldStatus touched={touched.course} error={errors.course} value={form.course} />
              </div>
            </div>
            {touched.course && errors.course && (
              <p className="text-xs text-red-500 mt-1">{errors.course}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Year <span className="text-red-400">*</span>
            </label>
            <select
              name="year" value={form.year}
              onChange={handleChange} onBlur={handleBlur}
              className={inputClass('year') + ' bg-white'}
            >
              <option value="">Select year</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {touched.year && errors.year && (
              <p className="text-xs text-red-500 mt-1">{errors.year}</p>
            )}
          </div>
        </div>

        {/* Password with strength bar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password" value={form.password}
              onChange={handleChange} onBlur={handleBlur}
              placeholder="Minimum 8 characters"
              className={inputClass('password') + ' pr-12'}
            />
            <button
              type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password strength bar — only shows when user has typed */}
          {form.password && (
            <div className="mt-2">
              <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`pw-bar h-full ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className={`text-xs font-medium ${
                  strength.score <= 1 ? 'text-red-400'
                  : strength.score <= 2 ? 'text-orange-400'
                  : strength.score <= 3 ? 'text-yellow-500'
                  : 'text-green-500'
                }`}>
                  {strength.label}
                </p>
                <p className="text-xs text-gray-400">
                  {8 - form.password.length > 0
                    ? `${8 - form.password.length} more chars needed`
                    : 'Length requirement met'}
                </p>
              </div>
            </div>
          )}

          {touched.password && errors.password && (
            <p className="text-xs text-red-500 mt-1">{errors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Confirm Password <span className="text-red-400">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              type={showConfirm ? 'text' : 'password'}
              name="confirm" value={form.confirm}
              onChange={handleChange} onBlur={handleBlur}
              placeholder="Repeat your password"
              className={inputClass('confirm') + ' pr-12'}
            />
            <div className="absolute right-9">
              <FieldStatus touched={touched.confirm} error={errors.confirm} value={form.confirm} />
            </div>
            <button
              type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {touched.confirm && errors.confirm && (
            <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>
          )}
        </div>

        {/* Terms */}
        <p className="text-xs text-gray-400 leading-relaxed">
          By creating an account you agree to Netlodge's{' '}
          <Link href="/terms" className="text-orange-500 hover:underline">Terms of Use</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link>.
        </p>

        {/* Submit */}
        <button
          type="submit" disabled={loading}
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
        <p className="text-center text-xs text-gray-400">
          Are you a landlord?{' '}
          <Link href="/signup/landlord" className="text-gray-600 hover:underline">Register your property instead</Link>
        </p>

      </form>
    </AuthLayout>
  )
}
