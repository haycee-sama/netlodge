// app/verify/student/page.jsx
// Student identity verification page — /verify/student
// Student uploads student ID or admission letter and enters NIN/BVN

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
} from 'lucide-react'
import AuthLayout from '../../components/AuthLayout'

// Document type options the student can choose from
const DOC_TYPES = [
  { value: 'student-id',        label: 'Student ID Card' },
  { value: 'admission-letter',  label: 'Admission Letter' },
  { value: 'school-fees',       label: 'School Fees Receipt (current session)' },
]

export default function StudentVerifyPage() {

  const router = useRouter()

  const [docType, setDocType]       = useState('')
  const [file, setFile]             = useState(null)
  const [nin, setNin]               = useState('')
  const [uniEmail, setUniEmail]     = useState('')
  const [errors, setErrors]         = useState({})
  const [loading, setLoading]       = useState(false)

  // Handle file selection from the upload input
  function handleFile(e) {
    const selected = e.target.files[0]
    if (!selected) return

    // Check file size — max 5MB
    if (selected.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, file: 'File must be under 5MB' }))
      return
    }

    setFile(selected)
    setErrors((prev) => ({ ...prev, file: '' }))
  }

  function removeFile() {
    setFile(null)
  }

  function validate() {
    const e = {}
    if (!docType)           e.docType = 'Please select a document type'
    if (!file)              e.file    = 'Please upload your document'
    if (!nin.trim())        e.nin     = 'Please enter your NIN or BVN'
    if (nin.length < 11)    e.nin     = 'NIN/BVN must be 11 digits'
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

    // Simulate upload + API call
    // In the real app: POST form data with file to /api/verify/student
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Redirect to status page after submission
    router.push('/verify/status')
  }

  return (
    <AuthLayout
      title="Verify Your Student Identity"
      subtitle="Upload your student document and confirm your identity. Verification takes up to 24 hours."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* ── Info banner ── */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Your documents are encrypted and stored securely. They are never
            shared with landlords or other users.
          </p>
        </div>

        {/* ── Document Type ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Type <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-col gap-2">
            {DOC_TYPES.map((doc) => (
              <button
                key={doc.value}
                type="button"
                onClick={() => {
                  setDocType(doc.value)
                  setErrors((prev) => ({ ...prev, docType: '' }))
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                  docType === doc.value
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  docType === doc.value
                    ? 'border-orange-500'
                    : 'border-gray-300'
                }`}>
                  {docType === doc.value && (
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                  )}
                </div>
                <span className="text-sm text-gray-700">{doc.label}</span>
              </button>
            ))}
          </div>
          {errors.docType && (
            <p className="text-xs text-red-500 mt-1">{errors.docType}</p>
          )}
        </div>

        {/* ── File Upload ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Document <span className="text-red-400">*</span>
          </label>

          {file ? (
            /* File selected — show file name with remove option */
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <FileCheck className="w-5 h-5 text-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* No file yet — show upload area */
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 cursor-pointer transition-all ${
              errors.file
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
            }`}>
              <Upload className="w-8 h-8 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG, or PDF · Max 5MB
                </p>
              </div>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          )}

          {errors.file && (
            <p className="text-xs text-red-500 mt-1">{errors.file}</p>
          )}
        </div>

        {/* ── NIN / BVN ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            NIN or BVN <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={nin}
            onChange={(e) => {
              // Only allow numbers, max 11 digits
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
          {errors.nin ? (
            <p className="text-xs text-red-500 mt-1">{errors.nin}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              Your NIN/BVN is encrypted and used only for identity verification.
            </p>
          )}
        </div>

        {/* ── University Email (optional) ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            University Email
            <span className="text-gray-400 font-normal ml-1">(optional but speeds up verification)</span>
          </label>
          <input
            type="email"
            value={uniEmail}
            onChange={(e) => setUniEmail(e.target.value)}
            placeholder="e.g. amara@uniabuja.edu.ng"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all"
          />
        </div>

        {/* ── What happens next ── */}
        <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
            What happens next
          </p>
          {[
            'Our system runs an automated NIN/BVN check instantly',
            'Your document is reviewed by our admin team within 24 hours',
            'You receive an email and SMS with your verification result',
            'Once verified you can search and book rooms on Netlodge',
          ].map((step) => (
            <div key={step} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600">{step}</p>
            </div>
          ))}
        </div>

        {/* ── Submit ── */}
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
          <Link href="/verify/status" className="text-orange-500 hover:underline">
            Check your verification status
          </Link>
        </p>

      </form>
    </AuthLayout>
  )
}