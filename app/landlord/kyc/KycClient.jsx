// app/landlord/kyc/KycClient.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileCheck, ShieldCheck, ArrowRight, X, AlertCircle, CheckCircle, Clock,
} from 'lucide-react'
import AuthLayout from '../../components/AuthLayout'
import FileUpload from '../../components/FileUpload'
import { submitLandlordKyc } from '../../../lib/actions/landlord'

const PROCESS_STEPS = [
  { icon: FileCheck, title: 'Documents Received', desc: 'Your files are securely stored the moment you submit' },
  { icon: Clock, title: '48hr Manual Review', desc: 'Our team manually reviews all documents' },
  { icon: CheckCircle, title: 'Verified Badge', desc: 'You receive email and SMS on approval' },
]

function UploadedFile({ file, onRemove }) {
  return (
    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
      <FileCheck className="w-5 h-5 text-green-500 shrink-0" />
      <p className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">{file.name}</p>
      <button type="button" onClick={onRemove} className="text-gray-500 hover:text-red-500 transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function KycClient() {
  const router = useRouter()

  const [govId, setGovId] = useState(null)
  const [propertyDoc, setPropertyDoc] = useState(null)
  const [propertyPhotos, setPropertyPhotos] = useState([])

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!govId) { setError('Please upload your government-issued ID.'); return }
    if (!propertyDoc) { setError('Please upload your property ownership document.'); return }
    if (propertyPhotos.length === 0) { setError('Please upload at least one geo-tagged property photo.'); return }

    setLoading(true)
    const result = await submitLandlordKyc({ govId, propertyDoc, propertyPhotos })
    setLoading(false)

    if ('error' in result) { setError(result.error); return }

    router.push('/landlord/verify/status')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <AuthLayout
        title="Submit Your KYC Documents"
        subtitle="All landlords must be verified before listing rooms. Documents are reviewed within 48 hours."
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              All documents are stored securely and are only ever accessed by Netlodge admin staff for verification purposes.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Government-Issued ID <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">NIN card, International Passport, or Driver's License</p>
            {govId ? (
              <UploadedFile file={govId} onRemove={() => setGovId(null)} />
            ) : (
              <FileUpload
                endpoint="kycDocument"
                accept=".jpg,.jpeg,.png,.pdf"
                label="JPG, PNG, or PDF · Up to 8MB"
                onClientUploadComplete={(files) => setGovId(files[0] ?? null)}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Property Ownership Document <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">Certificate of Occupancy (C of O), Deed of Assignment, or Survey Plan</p>
            {propertyDoc ? (
              <UploadedFile file={propertyDoc} onRemove={() => setPropertyDoc(null)} />
            ) : (
              <FileUpload
                endpoint="kycDocument"
                accept=".jpg,.jpeg,.png,.pdf"
                label="JPG, PNG, or PDF · Up to 8MB"
                onClientUploadComplete={(files) => setPropertyDoc(files[0] ?? null)}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Geo-Tagged Property Photos <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">At least 3 photos taken on-site with location enabled on your phone camera</p>

            {propertyPhotos.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {propertyPhotos.map((photo, i) => (
                  <UploadedFile
                    key={photo.url}
                    file={photo}
                    onRemove={() => setPropertyPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
              </div>
            )}

            <FileUpload
              endpoint="kycDocument"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              label="JPG, PNG, or PDF · Up to 5 files, 8MB each"
              onClientUploadComplete={(files) => setPropertyPhotos((prev) => [...prev, ...files])}
            />
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              What happens after you submit
            </p>
            <div className="flex flex-col gap-3">
              {PROCESS_STEPS.map((step) => {
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

          <p className="text-center text-xs text-gray-500">
            Already submitted?{' '}
            <Link href="/landlord/verify/status" className="text-orange-500 hover:underline">
              Check your status
            </Link>
          </p>

        </form>
      </AuthLayout>
    </main>
  )
}