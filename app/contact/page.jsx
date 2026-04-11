'use client'
// app/contact/page.jsx
// Contact & Support — upgraded with:
// 1. Hero entrance animation
// 2. Scroll reveal on contact cards and form
// 3. Animated focus rings on form fields (contact-field class)
// 4. Form success state with a fade-in animation

import { useState } from 'react'
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  GraduationCap,
  Building2,
  Send,
  CheckCircle,
} from 'lucide-react'
import useScrollReveal from '../hooks/useScrollReveal'

// ── Contact info ──────────────────────────────────────────────

const CONTACT_DETAILS = [
  {
    icon: Mail,
    label: 'Email',
    value: 'hello@netlodge.ng',
    sub: 'We reply within 4 hours on weekdays',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+234 800 000 0000',
    sub: 'Monday to Saturday, 8am – 8pm WAT',
  },
  {
    icon: MapPin,
    label: 'Launch Cities',
    value: 'Abuja · Lagos · Enugu',
    sub: 'National expansion coming Year 2',
  },
  {
    icon: Clock,
    label: 'Support Hours',
    value: 'Mon – Sat: 8am to 8pm',
    sub: 'Sundays: Emergency support only',
  },
]

const QUERY_TYPES = [
  { value: '',              label: 'Select a query type' },
  { value: 'student',      label: 'I am a student — booking or account issue' },
  { value: 'landlord',     label: 'I am a landlord — listing or KYC issue' },
  { value: 'payment',      label: 'Payment or escrow question' },
  { value: 'dispute',      label: 'I want to file or follow up on a dispute' },
  { value: 'fraud',        label: 'I want to report a fraudulent listing or agent' },
  { value: 'other',        label: 'Something else' },
]

// ── Component ─────────────────────────────────────────────────

export default function ContactPage() {
  useScrollReveal()

  const [form, setForm] = useState({
    name:      '',
    email:     '',
    phone:     '',
    queryType: '',
    message:   '',
  })

  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors]       = useState({})

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function validate() {
    const newErrors = {}
    if (!form.name.trim())      newErrors.name      = 'Please enter your name'
    if (!form.email.trim())     newErrors.email     = 'Please enter your email'
    if (!form.queryType)        newErrors.queryType = 'Please select a query type'
    if (!form.message.trim())   newErrors.message   = 'Please enter your message'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    return newErrors
  }

  function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setSubmitted(true)
  }

  // Shared input class with orange focus ring
  const inputClass = (hasError) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 transition-all contact-field ${
      hasError
        ? 'border-red-300'
        : 'border-gray-200 focus:border-orange-400'
    }`

  return (
    <div className="min-h-screen bg-gray-50 page-enter">

      {/* ── Hero ── */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="hero-animate hero-delay-0 flex items-center justify-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-medium text-orange-400 uppercase tracking-wider">
              Support
            </span>
          </div>
          <h1 className="hero-animate hero-delay-1 text-4xl sm:text-5xl font-bold mb-4">
            We Are Here to Help
          </h1>
          <p className="hero-animate hero-delay-2 text-gray-300 max-w-xl mx-auto">
            Whether you are a student with a booking question or a landlord
            with a KYC issue — our team responds within 4 hours on weekdays.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* ── Contact Info ── */}
          <div className="flex flex-col gap-6 reveal-left">

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Contact Details</h2>
              <p className="text-sm text-gray-500">
                Reach us through any of the channels below.
              </p>
            </div>

            {CONTACT_DETAILS.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-800">{item.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                  </div>
                </div>
              )
            })}

            {/* Quick links */}
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-800 mb-3">Quick Links</p>
              <div className="flex flex-col gap-2">
                <a href="/faq" className="flex items-center gap-2 text-sm text-orange-600 hover:underline">
                  <GraduationCap className="w-4 h-4" />
                  Student FAQs
                </a>
                <a href="/faq" className="flex items-center gap-2 text-sm text-orange-600 hover:underline">
                  <Building2 className="w-4 h-4" />
                  Landlord FAQs
                </a>
                <a href="/about" className="flex items-center gap-2 text-sm text-orange-600 hover:underline">
                  <ShieldCheck className="w-4 h-4" />
                  How Verification Works
                </a>
              </div>
            </div>
          </div>

          {/* ── Contact Form ── */}
          <div className="lg:col-span-2 reveal-right">

            {submitted ? (
              /* Success state with fade-in */
              <div
                className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center text-center"
                style={{ animation: 'pageFadeIn 0.4s ease-out forwards' }}
              >
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-5">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Message Sent!</h2>
                <p className="text-gray-500 max-w-md leading-relaxed mb-8">
                  Our support team will review your message and respond to{' '}
                  <strong>{form.email}</strong> within 4 hours on weekdays.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setForm({ name: '', email: '', phone: '', queryType: '', message: '' })
                  }}
                  className="text-sm font-semibold text-orange-500 hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Send Us a Message</h2>
                <p className="text-sm text-gray-500 mb-8">
                  Fill in the form below and we will get back to you as soon as possible.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                  {/* Name + Email row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Full Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="e.g. Amara Okonkwo"
                        className={inputClass(errors.name)}
                      />
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email Address <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="e.g. amara@gmail.com"
                        className={inputClass(errors.email)}
                      />
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone Number
                      <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="e.g. 08012345678"
                      className={inputClass(false)}
                    />
                  </div>

                  {/* Query type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Query Type <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="queryType"
                      value={form.queryType}
                      onChange={handleChange}
                      className={inputClass(errors.queryType) + ' bg-white'}
                    >
                      {QUERY_TYPES.map((qt) => (
                        <option key={qt.value} value={qt.value} disabled={qt.value === ''}>
                          {qt.label}
                        </option>
                      ))}
                    </select>
                    {errors.queryType && <p className="text-xs text-red-500 mt-1">{errors.queryType}</p>}
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Describe your issue or question in as much detail as possible..."
                      className={`${inputClass(errors.message)} resize-none`}
                    />
                    {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message}</p>}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold py-4 rounded-xl transition-all text-base"
                  >
                    <Send className="w-5 h-5" />
                    Send Message
                  </button>

                  <p className="text-xs text-center text-gray-400">
                    We typically respond within 4 hours on weekdays.
                    For urgent payment issues call us directly.
                  </p>

                </form>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
