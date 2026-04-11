// app/landlord/kyc/page.jsx
// Landlord KYC & document submission — /landlord/kyc
// Landlord submits government ID, property ownership doc,
// and geo-tagged property photos for manual review

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Upload,
  FileCheck,
  ShieldCheck,
  ArrowRight,
  X,
  AlertCircle,
  CheckCircle,
  MapPin,
  Clock,
} from 'lucide-react'
import AuthLayout from '../../components/AuthLayout'

// Document sections the landlord must complete
const DOC_SECTIONS = [
  {
    id:       'govId',
    title:    'Government-Issued ID',
    subtitle: 'NIN card, International Passport, or Driver\'s License',
    required: true,
  },
  {
    id:       'propertyDoc',
    title:    'Property Ownership Document',
    subtitle: 'Certificate of Occupancy (C of O), Deed of Assignment, or Survey Plan',
    required: true,
  },
  {
    id:       'propertyPhotos',
    title:    'Geo-Tagged Property Photos',
    subtitle: 'At least 3 photos taken on-site with location enabled on your phone camera',
    required: true,
  },
]

// What happens after submission
const PROCESS_STEPS = [
  {
    icon:  ShieldCheck,
    title: 'Auto-Scan',
    desc:  'NIN/BVN match and ID expiry checked instantly',
  },
  {
    icon:  Clock,
    title: '48hr Manual Review',
    desc:  'Our team manually reviews all documents',
  },
  {
    icon:  CheckCircle,
    title: 'Verified Badge',
    desc:  'You receive email and SMS on approval',
  },
]

export default function LandlordKYCPage() {

  const router = useRouter()

  // Track uploaded files per document section
  const [files, setFiles] = useState({
    govId:         null,
    propertyDoc:   null,
    propertyPhotos: null,
  })

  const [nin, setNin]       = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function handleFile(sectionId, e) {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, [sectionId]: 'File must be under 10MB' }))
      return
    }

    setFiles((prev) => ({ ...prev, [sectionId]: file }))
    setErrors((prev) => ({ ...prev, [sectionId]: '' }))
  }

  function removeFile(sectionId) {
    setFiles((prev) => ({ ...prev, [sectionId]: null }))
  }

  function validate() {
    const e = {}
    if (!files.govId)         e.govId         = 'Please upload your government ID'
    if (!files.propertyDoc)   e.propertyDoc   = 'Please upload your property document'
    if (!files.propertyPhotos) e.propertyPhotos = 'Please upload property photos'
    if (!nin.trim())          e.nin           = 'Please enter your NIN or BVN'
    if (nin.length < 11)      e.nin           = 'NIN/BVN must be 11 digits'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    // In the real app: POST form data to /api/landlord/kyc
    await new Promise((r) => setTimeout(r, 2000))
    router.push('/landlord/verify/status')
  }

  return (
    <AuthLayout
      title="Submit Your KYC Documents"
      subtitle="All landlords must be verified before listing rooms. Documents are reviewed within 48 hours."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            All documents are encrypted at rest (AES-256) and never shared with students or other users.
            Only Netlodge admin staff can access submitted documents.
          </p>
        </div>

        {/* Document upload sections */}
        {DOC_SECTIONS.map((section) => (
          <div key={section.id}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <label className="block text-sm font-semibold text-gray-800">
                  {section.title}
                  {section.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                <p className="text-xs text-gray-500 mt-0.5">{section.subtitle}</p>
              </div>
            </div>

            {files[section.id] ? (
              /* File uploaded — show name */
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <FileCheck className="w-5 h-5 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {files[section.id].name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(files[section.id].size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(section.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Upload area */
              <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-6 cursor-pointer transition-all ${
                errors[section.id]
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
              }`}>
                <Upload className="w-7 h-7 text-gray-400" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">Click to upload</p>
                  <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, or PDF · Max 10MB</p>
                </div>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFile(section.id, e)}
                  className="hidden"
                />
              </label>
            )}

            {errors[section.id] && (
              <p className="text-xs text-red-500 mt-1">{errors[section.id]}</p>
            )}
          </div>
        ))}

        {/* NIN / BVN */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            NIN or BVN <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={nin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 11)
              setNin(val)
              if (errors.nin) setErrors((prev) => ({ ...prev, nin: '' }))
            }}
            placeholder="Enter your 11-digit NIN or BVN"
            className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
              errors.nin
                ? 'border-red-300 focus:ring-red-100'
                : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
            }`}
          />
          {errors.nin && (
            <p className="text-xs text-red-500 mt-1">{errors.nin}</p>
          )}
        </div>

        {/* Process steps */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            What happens after you submit
          </p>
          <div className="flex flex-col gap-3">
            {PROCESS_STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{step.title}</p>
                    <p className="text-xs text-gray-500">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 rounded-xl transition-colors text-base"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting Documents...
            </>
          ) : (
            <>
              Submit for Verification
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-400">
          Already submitted?{' '}
          <Link href="/landlord/verify/status" className="text-orange-500 hover:underline">
            Check your status
          </Link>
        </p>

      </form>
    </AuthLayout>
  )
}