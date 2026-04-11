// app/landlord/payments/page.jsx
// Landlord payments & revenue tracker — /landlord/payments

'use client'

import { useState } from 'react'
import LandlordLayout from '../components/LandlordLayout'
import {
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle,
  Download,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building2,
} from 'lucide-react'

// ── Mock payment data ─────────────────────────────────────────
const PAYMENTS = [
  {
    id:        'PAY-2026-0042',
    bookingId: 'BK-2026-0042',
    student:   'Amara Okonkwo',
    room:      'Room A05 — Self-Contain',
    amount:    180000,
    date:      'March 25, 2026',
    status:    'Received',
    method:    'Card',
  },
  {
    id:        'PAY-2026-0039',
    bookingId: 'BK-2026-0039',
    student:   'Chidi Nweke',
    room:      'Room B03 — Single',
    amount:    120000,
    date:      'March 23, 2026',
    status:    'Received',
    method:    'Bank Transfer',
  },
  {
    id:        'PAY-2026-0031',
    bookingId: 'BK-2026-0031',
    student:   'Fatima Bello',
    room:      'Room C04 — Self-Contain',
    amount:    180000,
    date:      'March 28, 2026',
    status:    'In Escrow',
    method:    'USSD',
  },
  {
    id:        'PAY-2026-0028',
    bookingId: 'BK-2026-0028',
    student:   'Kola Adebayo',
    room:      'Room D01 — Single',
    amount:    120000,
    date:      'March 18, 2026',
    status:    'Received',
    method:    'Card',
  },
  {
    id:        'PAY-2025-0091',
    bookingId: 'BK-2025-0091',
    student:   'Ngozi Okonkwo',
    room:      'Room A03 — Shared',
    amount:    90000,
    date:      'March 15, 2025',
    status:    'Received',
    method:    'Bank Transfer',
  },
]

const STATUS_CONFIG = {
  'Received':  { badge: 'bg-green-100 text-green-700', icon: CheckCircle },
  'In Escrow': { badge: 'bg-blue-100 text-blue-700',   icon: Clock       },
  'Pending':   { badge: 'bg-amber-100 text-amber-700', icon: Clock       },
}

export default function LandlordPaymentsPage() {

  const totalReceived  = PAYMENTS.filter((p) => p.status === 'Received').reduce((s, p) => s + p.amount, 0)
  const totalInEscrow  = PAYMENTS.filter((p) => p.status === 'In Escrow').reduce((s, p) => s + p.amount, 0)
  const totalAll       = PAYMENTS.reduce((s, p) => s + p.amount, 0)

  const [filter, setFilter] = useState('All')
  const FILTERS = ['All', 'Received', 'In Escrow']

  const filtered = PAYMENTS.filter((p) =>
    filter === 'All' || p.status === filter
  )

  return (
    <LandlordLayout
      title="Payments & Revenue"
      subtitle="All incoming payments and escrow releases"
    >
      <div className="flex flex-col gap-6">

        {/* ── Revenue stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label:  'Total Received',
              value:  `₦${totalReceived.toLocaleString()}`,
              icon:   CheckCircle,
              color:  'text-green-500',
              bg:     'bg-green-50',
              sub:    `${PAYMENTS.filter((p) => p.status === 'Received').length} payments`,
            },
            {
              label:  'In Escrow',
              value:  `₦${totalInEscrow.toLocaleString()}`,
              icon:   Clock,
              color:  'text-blue-500',
              bg:     'bg-blue-50',
              sub:    'Pending 48hr window',
            },
            {
              label:  'Total Earnings',
              value:  `₦${totalAll.toLocaleString()}`,
              icon:   TrendingUp,
              color:  'text-orange-500',
              bg:     'bg-orange-50',
              sub:    `${PAYMENTS.length} total transactions`,
            },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4"
              >
                <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                  <p className="text-xs text-gray-400">{stat.sub}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Bank account notice ── */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Payments go to: GTBank — 0123456789 — Emeka Okafor
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              To update your bank account go to Profile & Settings.
              All escrow releases go to this account automatically.
            </p>
          </div>
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* ── Payments table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

          {/* Table header */}
          <div className="hidden sm:grid grid-cols-5 gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span className="col-span-2">Student / Room</span>
            <span>Date</span>
            <span>Method</span>
            <span className="text-right">Amount</span>
          </div>

          {/* Rows */}
          <div className="flex flex-col divide-y divide-gray-50">
            {filtered.map((payment) => {
              const config = STATUS_CONFIG[payment.status]
              const StatusIcon = config.icon
              return (
                <div
                  key={payment.id}
                  className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Student + room */}
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-orange-500">
                        {payment.student.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{payment.student}</p>
                      <p className="text-xs text-gray-500">{payment.room}</p>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center">
                    <p className="text-sm text-gray-600">{payment.date}</p>
                  </div>

                  {/* Method */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{payment.method}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${config.badge}`}>
                      <StatusIcon className="w-3 h-3" />
                      {payment.status}
                    </span>
                  </div>

                  {/* Amount + download */}
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <p className="text-sm font-bold text-gray-900">
                      ₦{payment.amount.toLocaleString()}
                    </p>
                    <button className="text-gray-400 hover:text-orange-500 transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              )
            })}
          </div>

        </div>

      </div>
    </LandlordLayout>
  )
}