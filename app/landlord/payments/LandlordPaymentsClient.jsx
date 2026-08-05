// app/landlord/payments/LandlordPaymentsClient.jsx
'use client'

import { useState } from 'react'
import LandlordLayout from '../components/LandlordLayout'
import { CreditCard, TrendingUp, Clock, CheckCircle, Download, AlertCircle, Search } from 'lucide-react'
import { formatNaira, formatDateTime } from '../../../lib/format'
import EmptyState from '../../components/shared/EmptyState'

const ESCROW_WINDOW_HOURS = 48

// Escrow is conceptual (48hr post-payment window), not a stored DB
// field — derived here from paidAt rather than faked.
function escrowStatusFor(paidAt) {
  if (!paidAt) return 'Received'
  const hoursSincePaid = (Date.now() - new Date(paidAt).getTime()) / 3600000
  return hoursSincePaid < ESCROW_WINDOW_HOURS ? 'In Escrow' : 'Received'
}

function expectedReleaseLabel(paidAt) {
  if (!paidAt) return null
  const releaseDate = new Date(new Date(paidAt).getTime() + ESCROW_WINDOW_HOURS * 60 * 60 * 1000)
  return formatDateTime(releaseDate)
}

const STATUS_CONFIG = {
  'Received':  { badge: 'bg-green-100 text-green-700', icon: CheckCircle },
  'In Escrow': { badge: 'bg-blue-100 text-blue-700',   icon: Clock       },
}

export default function LandlordPaymentsClient({ payments }) {
  const enriched = payments.map((p) => ({ ...p, escrowStatus: escrowStatusFor(p.paidAt) }))

  const totalReceived = enriched.filter((p) => p.escrowStatus === 'Received').reduce((s, p) => s + p.roomPrice, 0)
  const totalInEscrow = enriched.filter((p) => p.escrowStatus === 'In Escrow').reduce((s, p) => s + p.roomPrice, 0)
  const totalAll = enriched.reduce((s, p) => s + p.roomPrice, 0)

  const [filter, setFilter] = useState('All')
  const FILTERS = ['All', 'Received', 'In Escrow']
  const filtered = enriched.filter((p) => filter === 'All' || p.escrowStatus === filter)

  return (
    <LandlordLayout title="Payments & Revenue" subtitle="All incoming payments and escrow releases">
      <div className="flex flex-col gap-6">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Received', value: formatNaira(totalReceived), icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', sub: `${enriched.filter((p) => p.escrowStatus === 'Received').length} payments` },
            { label: 'In Escrow',      value: formatNaira(totalInEscrow), icon: Clock,       color: 'text-blue-500',  bg: 'bg-blue-50',  sub: 'Pending 48hr window' },
            { label: 'Total Earnings', value: formatNaira(totalAll),       icon: TrendingUp,  color: 'text-orange-500', bg: 'bg-orange-50', sub: `${enriched.length} total transactions` },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
                <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                  <p className="text-xs text-gray-500">{stat.sub}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Payments go to your registered bank account</p>
            <p className="text-xs text-amber-600 mt-0.5">
              To update your bank account go to Profile and Settings. All escrow releases go there automatically once the 48-hour window closes and our hourly release check runs.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {filtered.length > 0 && (
            <div className="hidden sm:grid grid-cols-5 gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span className="col-span-2">Student / Room</span>
              <span>Date</span>
              <span>Status</span>
              <span className="text-right">Amount</span>
            </div>
          )}

          {filtered.length > 0 ? (
            <div className="flex flex-col divide-y divide-gray-50">
              {filtered.map((payment) => {
                const config = STATUS_CONFIG[payment.escrowStatus]
                const StatusIcon = config.icon
                const releaseLabel = payment.escrowStatus === 'In Escrow' ? expectedReleaseLabel(payment.paidAt) : null
                return (
                  <div key={payment.id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="sm:col-span-2 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-orange-500">{payment.studentName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{payment.studentName}</p>
                        <p className="text-xs text-gray-500">{payment.roomLabel}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <p className="text-sm text-gray-600">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : '—'}</p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${config.badge}`}>
                        <StatusIcon className="w-3 h-3" />
                        {payment.escrowStatus}
                      </span>
                      {releaseLabel && (
                        <span className="text-xs text-gray-500">Expected release: {releaseLabel}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <p className="text-sm font-bold text-gray-900">{formatNaira(payment.roomPrice)}</p>
                      <button className="text-gray-500 hover:text-orange-500 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={payments.length > 0 ? Search : CreditCard}
              title={payments.length > 0 ? 'No payments match this filter' : 'No payments yet'}
              description={
                payments.length > 0
                  ? 'Try switching to a different filter to see your other payments.'
                  : 'Payments will appear here once a student books and pays for one of your rooms.'
              }
            />
          )}
        </div>

      </div>
    </LandlordLayout>
  )
}