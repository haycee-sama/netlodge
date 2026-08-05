// app/(admin)/admin/kyc/KycModerationClient.jsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileCheck, GraduationCap, Building2, ExternalLink, CheckCircle,
  XCircle, AlertCircle, Phone, Mail,
} from 'lucide-react'
import { approveUserKyc, rejectUserKyc } from '../../../../lib/actions/admin'

function RejectForm({ userId, roleType, onDone }) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit() {
    if (reason.trim().length < 5) {
      setError('Please provide a reason (at least 5 characters).')
      return
    }
    startTransition(async () => {
      const result = await rejectUserKyc(userId, roleType, reason)
      if ('error' in result) { setError(result.error); return }
      onDone()
      router.refresh()
    })
  }

  return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-3 mt-3">
      <textarea
        value={reason}
        onChange={(e) => { setReason(e.target.value); if (error) setError('') }}
        rows={2}
        placeholder="Reason for rejection (shown to the user)..."
        className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-100 resize-none"
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onDone} className="text-xs font-medium text-gray-500 px-3 py-1.5">Cancel</button>
        <button
          onClick={submit}
          disabled={isPending}
          className="text-xs font-semibold bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-1.5 rounded-lg"
        >
          {isPending ? 'Submitting...' : 'Confirm Rejection'}
        </button>
      </div>
    </div>
  )
}

function KycCard({ entry }) {
  const router = useRouter()
  const [showReject, setShowReject] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const Icon = entry.roleType === 'student' ? GraduationCap : Building2

  function approve() {
    setError('')
    startTransition(async () => {
      const result = await approveUserKyc(entry.userId, entry.roleType)
      if ('error' in result) { setError(result.error); return }
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900">{entry.firstName} {entry.lastName}</p>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium capitalize">{entry.roleType}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <Mail className="w-3 h-3" /> {entry.email}
            </div>
            {entry.phone && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                <Phone className="w-3 h-3" /> {entry.phone}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 shrink-0">
          Submitted {new Date(entry.submittedAt).toLocaleDateString()}
        </p>
      </div>

      {entry.roleType === 'student' ? (
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-400">University</p><p className="font-medium text-gray-800">{entry.university}</p></div>
          <div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-400">Course / Year</p><p className="font-medium text-gray-800">{entry.course} · {entry.yearLevel}</p></div>
        </div>
      ) : (
        <div className="mb-4 text-xs">
          <div className="bg-gray-50 rounded-lg p-2 inline-block"><p className="text-gray-400">Business Name</p><p className="font-medium text-gray-800">{entry.businessName || '—'}</p></div>
        </div>
      )}

      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Documents</p>
        {entry.kycDocuments.length === 0 ? (
          <p className="text-xs text-gray-400">No documents on file.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {entry.kycDocuments.map((doc, i) => (
              
                key={i}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                <FileCheck className="w-3.5 h-3.5" />
                {doc.type} <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {!showReject && (
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={approve}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
          >
            <CheckCircle className="w-4 h-4" /> Approve
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold py-2 rounded-xl transition-colors"
          >
            <XCircle className="w-4 h-4" /> Reject
          </button>
        </div>
      )}

      {showReject && (
        <RejectForm userId={entry.userId} roleType={entry.roleType} onDone={() => setShowReject(false)} />
      )}
    </div>
  )
}

export default function KycModerationClient({ students, landlords }) {
  const allEntries = [...students, ...landlords].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))

  if (allEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100">
        <FileCheck className="w-10 h-10 text-gray-300 mb-3" />
        <p className="font-semibold text-gray-700">No pending KYC submissions</p>
        <p className="text-sm text-gray-500 mt-1">You're all caught up.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {allEntries.map((entry) => <KycCard key={entry.userId} entry={entry} />)}
    </div>
  )
}