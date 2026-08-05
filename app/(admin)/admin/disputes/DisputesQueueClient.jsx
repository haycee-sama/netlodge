// app/(admin)/admin/disputes/DisputesQueueClient.jsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldAlert, CheckCircle, XCircle, AlertCircle, Building2,
} from 'lucide-react'
import { resolveDispute } from '../../../../lib/actions/admin'

function ImageGallery({ title, images, emptyMessage }) {
  if (!images || images.length === 0) {
    return (
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</p>
        <p className="text-sm text-gray-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title} ({images.length})</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {images.map((img, index) => (
          
            key={`${img.url}-${index}`}
            href={img.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg overflow-hidden border border-gray-200 hover:border-orange-300 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.name || img.alt || ''} className="w-full h-28 object-cover" />
          </a>
        ))}
      </div>
    </div>
  )
}

function DisputeCard({ dispute }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(null)

  function handleResolve(resolutionType) {
    setError('')
    startTransition(async () => {
      const result = await resolveDispute(dispute.bookingId, resolutionType)
      if ('error' in result) {
        setError(result.error)
        setConfirming(null)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-red-100 p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{dispute.roomLabel} at {dispute.propertyName}</p>
            <p className="text-xs text-gray-500">Booked by {dispute.studentName} ({dispute.studentEmail})</p>
            <p className="text-xs text-gray-400 mt-1">Booking {dispute.bookingRef}</p>
          </div>
        </div>
        <span className="text-xs text-gray-400 shrink-0">
          Filed {dispute.disputedAt ? new Date(dispute.disputedAt).toLocaleDateString() : ''}
        </span>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Student Reason</p>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{dispute.disputeReason || 'No reason provided.'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <ImageGallery
          title="Student Evidence"
          images={dispute.disputeEvidence}
          emptyMessage="No evidence photos were submitted."
        />
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Original Listing Photos</p>
          </div>
          {dispute.listingImages.length === 0 ? (
            <p className="text-sm text-gray-400">No listing photos on file.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {dispute.listingImages.map((img, index) => (
                <div key={`${img.url}-${index}`} className="rounded-lg overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt || ''} className="w-full h-28 object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-5 flex justify-between text-sm">
        <span className="text-gray-600">Amount paid</span>
        <span className="font-bold text-gray-900">Naira {dispute.totalAmount.toLocaleString()}</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {confirming ? (
        <div className="flex flex-col gap-3 bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-700">
            {confirming === 'refund'
              ? 'This will cancel the booking, free the room, and flag the payment for a manual refund. Confirm?'
              : 'This will release payment directly to the landlord and mark this dispute resolved. Confirm?'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleResolve(confirming)}
              disabled={isPending}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              {isPending ? 'Processing...' : 'Confirm'}
            </button>
            <button
              onClick={() => setConfirming(null)}
              disabled={isPending}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setConfirming('refund')}
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Resolve for Student (Refund)
          </button>
          <button
            onClick={() => setConfirming('release')}
            className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Resolve for Landlord (Release)
          </button>
        </div>
      )}
    </div>
  )
}

export default function DisputesQueueClient({ disputes }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dispute Resolution</h1>
        <p className="text-gray-500 text-sm mt-1">{disputes.length} open dispute{disputes.length !== 1 ? 's' : ''}</p>
      </div>

      {disputes.length > 0 ? (
        <div className="flex flex-col gap-5">
          {disputes.map((dispute) => <DisputeCard key={dispute.bookingId} dispute={dispute} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">No open disputes</h3>
          <p className="text-gray-500 text-sm">The dispute queue is clear.</p>
        </div>
      )}
    </div>
  )
}