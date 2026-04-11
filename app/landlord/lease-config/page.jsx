// app/landlord/lease-config/page.jsx
// Lease configuration — /landlord/lease-config
// Landlord sets default lease terms across all their properties

'use client'

import { useState } from 'react'
import LandlordLayout from '../components/LandlordLayout'
import {
  CheckCircle,
  Save,
  AlertCircle,
  Calendar,
  Clock,
  Info,
} from 'lucide-react'

// ── Lease option config ───────────────────────────────────────
const LEASE_OPTIONS = [
  {
    id:       'fullYear',
    label:    '1 Full Year',
    desc:     'Student pays the full annual rent in one payment.',
    required: true,
    tag:      'Default',
  },
  {
    id:       'perSemester',
    label:    'Per Semester',
    desc:     'Student pays in 2 instalments — once per semester (approximately 5-6 months each).',
    required: false,
    tag:      'Optional',
  },
  {
    id:       'halfYear',
    label:    'Half Year',
    desc:     'Student pays in 2 instalments of exactly 6 months each.',
    required: false,
    tag:      'Optional',
  },
]

// Payment schedule notes shown per option
const SCHEDULE_INFO = {
  perSemester: [
    { label: 'Payment 1', value: 'On booking — covers 1st semester'   },
    { label: 'Payment 2', value: 'Auto-reminder sent 30 days before due' },
  ],
  halfYear: [
    { label: 'Payment 1', value: 'On booking — covers first 6 months'   },
    { label: 'Payment 2', value: 'Auto-reminder sent 30 days before due' },
  ],
}

export default function LeaseConfigPage() {

  const [enabled, setEnabled] = useState({
    fullYear:    true,
    perSemester: false,
    halfYear:    false,
  })

  // Notice period for lease expiry reminders
  const [reminderDays, setReminderDays] = useState('30')

  // Minimum stay policy
  const [minStay, setMinStay] = useState('fullYear')

  const [saved, setSaved] = useState(false)

  function toggleOption(id) {
    if (id === 'fullYear') return // cannot disable
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }))
    setSaved(false)
  }

  async function handleSave() {
    // In the real app: PATCH /api/landlord/lease-config
    await new Promise((r) => setTimeout(r, 800))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <LandlordLayout
      title="Lease Configuration"
      subtitle="Set default lease terms for all your properties"
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* ── Info notice ── */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            These settings apply as defaults across all your properties.
            You can override lease options per individual room when creating or editing a room.
          </p>
        </div>

        {/* ── Lease Options ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-2">Available Lease Durations</h2>
          <p className="text-sm text-gray-500 mb-5">
            Enable the lease options you want to offer students across your properties.
            1 Year is always required and cannot be disabled.
          </p>

          <div className="flex flex-col gap-4">
            {LEASE_OPTIONS.map((option) => {
              const isEnabled = enabled[option.id]
              return (
                <div
                  key={option.id}
                  className={`rounded-2xl border-2 overflow-hidden transition-all ${
                    isEnabled
                      ? 'border-orange-400'
                      : 'border-gray-100'
                  }`}
                >
                  {/* Option header */}
                  <button
                    onClick={() => toggleOption(option.id)}
                    className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
                      isEnabled ? 'bg-orange-50' : 'bg-white hover:bg-gray-50'
                    } ${option.required ? 'cursor-default' : ''}`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      isEnabled
                        ? 'bg-orange-500 border-orange-500'
                        : 'border-gray-300'
                    }`}>
                      {isEnabled && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>

                    {/* Label + tag */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm ${isEnabled ? 'text-orange-700' : 'text-gray-800'}`}>
                          {option.label}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          option.required
                            ? 'bg-gray-200 text-gray-600'
                            : 'bg-orange-100 text-orange-600'
                        }`}>
                          {option.tag}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
                    </div>

                    <Calendar className={`w-5 h-5 shrink-0 ${isEnabled ? 'text-orange-500' : 'text-gray-300'}`} />
                  </button>

                  {/* Payment schedule info — shown when enabled and not full year */}
                  {isEnabled && SCHEDULE_INFO[option.id] && (
                    <div className="px-4 pb-4 bg-orange-50 border-t border-orange-100">
                      <p className="text-xs font-semibold text-orange-700 mb-2 mt-3">
                        Payment Schedule
                      </p>
                      <div className="flex flex-col gap-1">
                        {SCHEDULE_INFO[option.id].map((item) => (
                          <div key={item.label} className="flex justify-between text-xs">
                            <span className="text-gray-500">{item.label}</span>
                            <span className="font-medium text-gray-700">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Reminder Settings ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-2">Lease Expiry Reminders</h2>
          <p className="text-sm text-gray-500 mb-5">
            Netlodge automatically sends email and SMS reminders to you and your tenants
            before leases expire. Set how many days in advance reminders should be sent.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {['14', '30', '60'].map((days) => (
              <button
                key={days}
                onClick={() => { setReminderDays(days); setSaved(false) }}
                className={`flex flex-col items-center py-4 rounded-xl border-2 transition-all ${
                  reminderDays === days
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-100 hover:border-orange-200'
                }`}
              >
                <Clock className={`w-5 h-5 mb-1 ${reminderDays === days ? 'text-orange-500' : 'text-gray-400'}`} />
                <p className={`text-lg font-bold ${reminderDays === days ? 'text-orange-600' : 'text-gray-800'}`}>
                  {days}
                </p>
                <p className={`text-xs ${reminderDays === days ? 'text-orange-500' : 'text-gray-400'}`}>
                  days before
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Minimum Stay ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-2">Minimum Stay Policy</h2>
          <p className="text-sm text-gray-500 mb-5">
            Set the minimum lease duration you require across all your properties.
          </p>

          <div className="flex flex-col gap-3">
            {[
              { value: 'fullYear',    label: '1 Full Year minimum',  desc: 'No shorter leases accepted' },
              { value: 'halfYear',    label: 'Half Year minimum',     desc: '6 months minimum stay'     },
              { value: 'perSemester', label: 'Per Semester minimum',  desc: '1 semester minimum stay'   },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => { setMinStay(option.value); setSaved(false) }}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  minStay === option.value
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  minStay === option.value ? 'border-orange-500' : 'border-gray-300'
                }`}>
                  {minStay === option.value && (
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${minStay === option.value ? 'text-orange-700' : 'text-gray-800'}`}>
                    {option.label}
                  </p>
                  <p className="text-xs text-gray-500">{option.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Save button ── */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 font-bold px-6 py-3 rounded-xl transition-all ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            {saved ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Settings Saved!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Lease Settings
              </>
            )}
          </button>
        </div>

      </div>
    </LandlordLayout>
  )
}