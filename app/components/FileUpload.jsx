// app/components/FileUpload.jsx
'use client'

import { useState } from 'react'
import { Upload, Loader2, AlertCircle } from 'lucide-react'
import { useUploadThing } from '../../lib/uploadthing'

/**
 * @param {'roomImage' | 'kycDocument'} endpoint
 * @param {(files: {url: string, name: string}[]) => void} onClientUploadComplete
 * @param {boolean} multiple
 * @param {string} accept - native file input accept attribute
 * @param {string} label - helper text shown under the upload prompt
 */
export default function FileUpload({ endpoint, onClientUploadComplete, multiple = false, accept, label }) {
  const [error, setError] = useState('')
  const [selectedCount, setSelectedCount] = useState(0)

  const { startUpload, isUploading } = useUploadThing(endpoint, {
    onClientUploadComplete: (res) => {
      setSelectedCount(0)
      setError('')
      onClientUploadComplete((res ?? []).map((f) => ({ url: f.ufsUrl ?? f.url, name: f.name })))
    },
    onUploadError: (err) => {
      setSelectedCount(0)
      setError(err.message || 'Upload failed. Please try again.')
    },
  })

  function handleSelect(e) {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return
    setError('')
    setSelectedCount(selected.length)
    startUpload(selected)
    e.target.value = '' // allow re-selecting the same file later
  }

  return (
    <div>
      <label
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 transition-all ${
          isUploading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
        } ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'}`}
      >
        {isUploading ? (
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        ) : (
          <Upload className="w-8 h-8 text-gray-500" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {isUploading ? `Uploading ${selectedCount} file${selectedCount === 1 ? '' : 's'}...` : 'Click to upload or drag and drop'}
          </p>
          {label && <p className="text-xs text-gray-500 mt-1">{label}</p>}
        </div>
        <input
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleSelect}
          disabled={isUploading}
          className="hidden"
        />
      </label>
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  )
}