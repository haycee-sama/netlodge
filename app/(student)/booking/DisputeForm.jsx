// app/(student)/booking/DisputeForm.jsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, ImageIcon } from 'lucide-react'
import FileUpload from '../../components/FileUpload'
import { fileDispute } from '../../../lib/actions/dispute'

export default function DisputeForm({ bookingId, onSubmitted }) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState([]) // [{url, name}]
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleEvidenceUploaded(files) {
    setEvidence((prev) => [...prev, ...files])
  }

  function removeEvidence(index) {
    setEvidence((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    if (reason.trim().length < 10) {
      setError('Please describe the issue in at least 10 characters.')
      return
    }
    setError('')
    startTransition(async () => {
      const result = await fileDispute(bookingId, reason, evidence)
      if ('error' in result) {
        setError(result.error)
        return
      }
      onSubmitted?.()
      router.refresh()
    })
  }

  return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-4 mt-3">
      <p className="text-sm font-semibold text-red-700 mb-2">File a Dispute</p>
      <p className="text-xs text-red-600 mb-3">
        Explain how the room did not match the listing. Our team reviews disputes within 24 hours.
      </p>
      <textarea
        value={reason}
        onChange={(e) => { setReason(e.target.value); if (error) setError('') }}
        rows={3}
        placeholder="e.g. The room shown in photos was not the actual room I was given..."
        className="w-full px-3 py-2.5 rounded-xl border border-red-200 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all resize-none"
      />

      <div className="mt-3">
        <p className="text-xs font-semibold text-red-700 mb-2">
          Upload Evidence Photos (optional)
        </p>
        <FileUpload
          endpoint="kycDocument"
          multiple
          accept="image/*"
          label="JPG or PNG - up to 5 photos, 8MB each"
          onClientUploadComplete={handleEvidenceUploaded}
        />

        {evidence.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
            {evidence.map((file, i) => (
              <div key={file.url} className="relative aspect-square rounded-lg overflow-hidden bg-white border border-red-100 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeEvidence(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {evidence.length === 0 && (
          <div className="flex items-center gap-2 mt-2 text-xs text-red-500">
            <ImageIcon className="w-3.5 h-3.5" />
            Photos help our team resolve disputes faster, but are not required.
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      <div className="flex justify-end mt-3">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          {isPending ? 'Submitting...' : 'Submit Dispute'}
        </button>
      </div>
    </div>
  )
}