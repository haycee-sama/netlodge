// app/signup/landlord/page.jsx
// Landlord registration — /signup/landlord

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Building2, CheckCircle } from 'lucide-react'
import AuthLayout from '../../components/AuthLayout'

const TRUST_POINTS = [
  'Get a verified badge that builds student trust',
  'Receive direct bookings with guaranteed escrow payment',
  'Manage all rooms and blocks from one dashboard',
  'No more dealing with fraudulent agents',
  'Track revenue, occupancy, and payments in real time',
]

export default function LandlordSignUpPage() {

  const router = useRouter()

  const [form, setForm] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    phone:     '',
    city:      '',
    password:  '',
    confirm:   '',
  })

  const [errors, setErrors]             = useState({})
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
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim())  e.lastName  = 'Required'
    if (!form.email.trim())     e.email     = 'Required'
    if (!form.phone.trim())     e.phone     = 'Required'
    if (!form.city)             e.city      = 'Please select your city'
    if (!form.password)         e.password  = 'Required'
    if (form.password.length < 8 && form.password)
                                e.password  = 'Minimum 8 characters'
    if (form.password !== form.confirm)
                                e.confirm   = 'Passwords do not match'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email))
                                e.email     = 'Enter a valid email'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1500))
    router.push('/landlord/kyc')
  }

  return (
    <AuthLayout
      title="List Your Property on Netlodge"
      subtitle="Register as a verified landlord and start receiving direct bookings from students."
    >
      {/* Benefits list */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
        <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-3">
          Why Landlords Choose Netlodge
        </p>
        <ul className="flex flex-col gap-2">
          {TRUST_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <span className="text-xs text-gray-700">{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          {['firstName', 'lastName'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {field === 'firstName' ? 'First Name' : 'Last Name'}
                <span className="text-red-400"> *</span>
              </label>
              <input
                type="text"
                name={field}
                value={form[field]}
                onChange={handleChange}
                placeholder={field === 'firstName' ? 'Emeka' : 'Okafor'}
                className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  errors[field]
                    ? 'border-red-300 focus:ring-red-100'
                    : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
                }`}
              />
              {errors[field] && (
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
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="emeka@gmail.com"
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

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone Number <span className="text-red-400">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="08012345678"
            className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
              errors.phone
                ? 'border-red-300 focus:ring-red-100'
                : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
            }`}
          />
          {errors.phone && (
            <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
          )}
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Property City <span className="text-red-400">*</span>
          </label>
          <select
            name="city"
            value={form.city}
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-xl border text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 transition-all ${
              errors.city
                ? 'border-red-300 focus:ring-red-100'
                : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
            }`}
          >
            <option value="">Select city</option>
            {['Abuja', 'Lagos', 'Enugu'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.city && (
            <p className="text-xs text-red-500 mt-1">{errors.city}</p>
          )}
        </div>

        {/* Password */}
        {[
          { name: 'password', label: 'Password',         show: showPassword, toggle: () => setShowPassword(!showPassword) },
          { name: 'confirm',  label: 'Confirm Password', show: showConfirm,  toggle: () => setShowConfirm(!showConfirm)   },
        ].map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {field.label} <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={field.show ? 'text' : 'password'}
                name={field.name}
                value={form[field.name]}
                onChange={handleChange}
                placeholder={field.name === 'password' ? 'Minimum 8 characters' : 'Repeat password'}
                className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  errors[field.name]
                    ? 'border-red-300 focus:ring-red-100'
                    : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
                }`}
              />
              <button
                type="button"
                onClick={field.toggle}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors[field.name] && (
              <p className="text-xs text-red-500 mt-1">{errors[field.name]}</p>
            )}
          </div>
        ))}

        {/* Terms */}
        <p className="text-xs text-gray-400 leading-relaxed">
          By registering you agree to Netlodge's{' '}
          <Link href="/terms" className="text-orange-500 hover:underline">Terms of Use</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link>.
          You will be asked to submit KYC documents before listing rooms.
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
              <Building2 className="w-5 h-5" />
              Create Landlord Account
            </>
          )}
        </button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-orange-500 font-semibold hover:underline">
            Log in
          </Link>
        </p>

        <p className="text-center text-xs text-gray-400">
          Looking for a room instead?{' '}
          <Link href="/signup/student" className="text-gray-600 hover:underline">
            Sign up as a student
          </Link>
        </p>

      </form>
    </AuthLayout>
  )
}