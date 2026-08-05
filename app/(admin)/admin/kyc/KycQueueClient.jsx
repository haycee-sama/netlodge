// app/(admin)/admin/kyc/KycQueueClient.jsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileCheck, GraduationCap, Building2, CheckCircle, XCircle,
  AlertCircle, Mail, Phone,
} from 'lucide-react'
import { approveUserKyc, rejectUserKyc } from '../../../../lib/actions/admin'

function isPdf(url) {
  return url.toLowerCase().endsWith('.pdf')
}

function DocumentViewer({ documents }) {
  if (!documents || documents.length === 0) {
    return <p className="text-sm text-gray-500">No documents were uploaded.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {documents.map((doc, index) => (
        <div key={`${doc.url}-${index}`} className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
          <div className="px-3 py-2 bg-white border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-700 truncate">{doc.type.replace(/_/g, ' ')}</p>
          </div>
          {isPdf(doc.url) ? (
            <iframe src={doc.url} title={doc.name} className="w-full h-40 bg-white" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.url} alt={doc.name} className="w-full h-40 object-cover" />
          )}
          
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs font-medium text-orange-600 hover:underline py-2 bg-white border-t border-gray-100"
          >
            Open full size
          </a>
        </div>
      ))}
    </div>
  )
}

function SubmissionRow({ submission }) {
  const router = useRouter()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    setError('')
    startTransition(async () => {
      const result = await approveUserKyc(submission.userId)
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleReject() {
    if (reason.trim().length < 5) {
      setError('Please provide a reason of at least 5 characters.')
      return
    }
    setError('')
    startTransition(async () => {
      const result = await rejectUserKyc(submission.userId, reason)
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            {submission.kind === 'student' ? (
              <GraduationCap className="w-5 h-5 text-orange-500" />
            ) : (
              <Building2 className="w-5 h-5 text-orange-500" />
            )}
          </div>
          <div>
            <p className="font-bold text-gray-900">{submission.name}</p>
            <p className="text-xs text-gray-500 capitalize">{submission.kind} account</p>
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Mail className="w-3 h-3" /> {submission.email}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Phone className="w-3 h-3" /> {submission.phone || '-'}
              </div>
              {submission.kind === 'student' && (
                <p className="text-xs text-gray-600">{submission.university} - {submission.course} - {submission.yearLevel}</p>
              )}
              {submission.kind === 'student' && submission.maskedNinBvn && (
                <p className="text-xs text-gray-600">NIN/BVN: {submission.maskedNinBvn}</p>
              )}
              {submission.kind === 'landlord' && submission.businessName && (
                <p className="text-xs text-gray-600">{submission.businessName}</p>
              )}
            </div>
          </div>
        </div>
        <span className="text-xs text-gray-400 shrink-0">
          Submitted {new Date(submission.submittedAt).toLocaleDateString()}
        </span>
      </div>

      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Uploaded Documents</p>
        <DocumentViewer documents={submission.documents} />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {rejecting ? (
        <div className="flex flex-col gap-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Explain why this submission is being rejected..."
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={isPending}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              {isPending ? 'Submitting...' : 'Confirm Rejection'}
            </button>
            <button
              onClick={() => { setRejecting(false); setReason(''); setError('') }}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={isPending}
            className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      )}
    </div>
  )
}

export default function KycQueueClient({ submissions }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KYC Queue</h1>
        <p className="text-gray-500 text-sm mt-1">{submissions.length} pending submission{submissions.length !== 1 ? 's' : ''}</p>
      </div>

      {submissions.length > 0 ? (
        <div className="flex flex-col gap-5">
          {submissions.map((submission) => (
            <SubmissionRow key={`${submission.kind}-${submission.userId}`} submission={submission} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <FileCheck className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">No pending submissions</h3>
          <p className="text-gray-500 text-sm">The KYC queue is clear. New submissions will appear here.</p>
        </div>
      )}
    </div>
  )
}