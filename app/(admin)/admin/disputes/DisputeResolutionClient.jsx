// app/(admin)/admin/disputes/DisputeResolutionClient.jsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, User, Building2, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { resolveDisputeForStudent, resolveDisputeForLandlord } from '../../../../lib/actions/admin'

function ConfirmBar({ label, description, confirmLabel, confirmColor, onConfirm, onCancel, isPending }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-3">
      <p className="text-sm font-semibold text-gray-800">{label}</p>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
      <div className="flex justify-end gap-2 mt-3">
        <button onClick={onCancel} disabled={isPending} className="text-xs font-medium text-gray-500 px-3 py-1.5">Cancel</button>
        <button
          onClick={onConfirm}
          disabled={isPending}
          className={`text-xs font-semibold text-white px-4 py-1.5 rounded-lg transition-colors ${confirmColor}`}
        >
          {isPending ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </div>
  )
}

function DisputeCard({ dispute }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(null) // 'student' | 'landlord' | null
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function resolve(side) {
    setError('')
    startTransition(async () => {
      const action = side === 'student' ? resolveDisputeForStudent : resolveDisputeForLandlord
      const result = await action(dispute.bookingId)
      if ('error' in result) { setError(result.error); setConfirming(null); return }
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-red-100 p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{dispute.roomLabel}</p>
            <p className="text-sm text-gray-500">{dispute.propertyName}</p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{dispute.bookingRef}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 shrink-0">
          Filed {dispute.disputedAt ? new Date(dispute.disputedAt).toLocaleString() : '—'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><User className="w-3.5 h-3.5" /> Student</div>
          <p className="text-sm font-medium text-gray-800">{dispute.studentName}</p>
          <p className="text-xs text-gray-500">{dispute.studentEmail}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><Building2 className="w-3.5 h-3.5" /> Landlord</div>
          <p className="text-sm font-medium text-gray-800">{dispute.landlordName}</p>
          <p className="text-xs text-gray-500">{dispute.landlordEmail}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Student's Reason</p>
        <p className="text-sm text-gray-700 bg-red-50 border border-red-100 rounded-xl p-3 whitespace-pre-wrap">
          {dispute.disputeReason || 'No reason provided.'}
        </p>
      </div>

      <div className="flex justify-between items-center text-sm bg-gray-50 rounded-lg px-3 py-2 mb-4">
        <span className="text-gray-500">Room price (in escrow)</span>
        <span className="font-bold text-gray-900">₦{dispute.roomPrice.toLocaleString()}</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {!confirming && (
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={() => setConfirming('student')}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
          >
            <CheckCircle className="w-4 h-4" /> Resolve for Student
          </button>
          <button
            onClick={() => setConfirming('landlord')}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
          >
            <XCircle className="w-4 h-4" /> Resolve for Landlord
          </button>
        </div>
      )}

      {confirming === 'student' && (
        <ConfirmBar
          label="Resolve in the student's favor?"
          description="This cancels the booking and frees the room. NOTE: the actual Paystack refund is not automated yet — you must issue it manually from the Paystack dashboard using this booking's payment reference."
          confirmLabel="Confirm Refund Resolution"
          confirmColor="bg-blue-500 hover:bg-blue-600"
          onConfirm={() => resolve('student')}
          onCancel={() => setConfirming(null)}
          isPending={isPending}
        />
      )}

      {confirming === 'landlord' && (
        <ConfirmBar
          label="Resolve in the landlord's favor?"
          description="This immediately transfers the room price to the landlord's registered bank account via Paystack. This cannot be undone from this screen."
          confirmLabel="Confirm & Release Funds"
          confirmColor="bg-green-500 hover:bg-green-600"
          onConfirm={() => resolve('landlord')}
          onCancel={() => setConfirming(null)}
          isPending={isPending}
        />
      )}
    </div>
  )
}

export default function DisputeResolutionClient({ disputes }) {
  if (disputes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100">
        <ShieldAlert className="w-10 h-10 text-gray-300 mb-3" />
        <p className="font-semibold text-gray-700">No open disputes</p>
        <p className="text-sm text-gray-500 mt-1">All clear.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {disputes.map((d) => <DisputeCard key={d.bookingId} dispute={d} />)}
    </div>
  )
}