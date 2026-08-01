// app/landlord/profile/LandlordProfileClient.jsx
'use client'

import { useState } from 'react'
import LandlordLayout from '../components/LandlordLayout'
import { Building2, CreditCard, Bell, Save, CheckCircle, ShieldCheck, AlertCircle, Clock, XCircle } from 'lucide-react'
import { updateLandlordProfile } from '../../../lib/actions/landlord'

const NIGERIAN_BANKS = ['GTBank', 'Access Bank', 'Zenith Bank', 'First Bank', 'UBA', 'Sterling Bank', 'Fidelity Bank', 'Union Bank']

const VERIFICATION_CONFIG = {
  approved: { label: 'Verified', badge: 'bg-green-100 text-green-700', icon: ShieldCheck },
  pending: { label: 'Under Review', badge: 'bg-amber-100 text-amber-700', icon: Clock },
  rejected: { label: 'Rejected', badge: 'bg-red-100 text-red-600', icon: XCircle },
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-orange-500" />
        </div>
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function SaveButton({ onClick, saved, loading, label = 'Save Changes' }) {
  return (
    <button
      onClick={onClick} disabled={loading}
      className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all ${
        saved ? 'bg-green-500 text-white' : 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white'
      }`}
    >
      {saved ? (<><CheckCircle className="w-4 h-4" /> Saved!</>) : loading ? 'Saving...' : (<><Save className="w-4 h-4" /> {label}</>)}
    </button>
  )
}

export default function LandlordProfileClient({ profile, maskedAccountNumber }) {

  const [businessName, setBusinessName] = useState(profile.businessName)
  const [businessSaved, setBusinessSaved] = useState(false)
  const [businessLoading, setBusinessLoading] = useState(false)
  const [businessError, setBusinessError] = useState('')

  const [payout, setPayout] = useState({ bankName: profile.bankName || NIGERIAN_BANKS[0], bankAccountNumber: '', bankAccountName: profile.bankAccountName })
  const [payoutSaved, setPayoutSaved] = useState(false)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutError, setPayoutError] = useState('')

  const [notifs, setNotifs] = useState({ newBookingRequests: true, paymentReleased: true, disputesFiled: true, leaseExpiryReminders: true, platformUpdates: false })

  const verificationConfig = VERIFICATION_CONFIG[profile.verificationStatus] ?? VERIFICATION_CONFIG.pending
  const VerificationIcon = verificationConfig.icon

  async function saveBusiness() {
    setBusinessLoading(true)
    setBusinessError('')
    const result = await updateLandlordProfile({ businessName })
    setBusinessLoading(false)
    if ('error' in result) { setBusinessError(result.error); return }
    setBusinessSaved(true)
    setTimeout(() => setBusinessSaved(false), 3000)
  }

  async function savePayout() {
    setPayoutLoading(true)
    setPayoutError('')

    const payload = { bankName: payout.bankName, bankAccountName: payout.bankAccountName }
    if (payout.bankAccountNumber.trim()) payload.bankAccountNumber = payout.bankAccountNumber.trim()

    const result = await updateLandlordProfile(payload)
    setPayoutLoading(false)
    if ('error' in result) { setPayoutError(result.error); return }
    setPayoutSaved(true)
    setPayout((prev) => ({ ...prev, bankAccountNumber: '' }))
    setTimeout(() => setPayoutSaved(false), 3000)
  }

  function toggleNotif(key) {
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <LandlordLayout title="Profile & Settings" subtitle="Manage your business info, payouts, and verification">
      <div className="max-w-3xl flex flex-col gap-6">

        <Section title="Business Information" icon={Building2}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Business / Property Name</label>
              <input
                type="text" value={businessName} onChange={(e) => { setBusinessName(e.target.value); setBusinessSaved(false) }}
                placeholder="e.g. Okafor Properties Ltd"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Name</label>
              <input type="text" value={`${profile.firstName} ${profile.lastName}`} disabled className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input type="email" value={profile.email} disabled className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input type="tel" value={profile.phone || '—'} disabled className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500" />
            </div>
          </div>
          {businessError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{businessError}</p>
            </div>
          )}
          <div className="flex justify-end">
            <SaveButton onClick={saveBusiness} saved={businessSaved} loading={businessLoading} />
          </div>
        </Section>

        <Section title="Payout Bank Account" icon={CreditCard}>
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
            <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              {maskedAccountNumber
                ? `Currently on file: ${maskedAccountNumber}. Enter a new number below only if you want to change it.`
                : 'No payout account on file yet. Escrow releases require a verified account.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank Name</label>
              <select
                value={payout.bankName} onChange={(e) => { setPayout((p) => ({ ...p, bankName: e.target.value })); setPayoutSaved(false) }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all"
              >
                {NIGERIAN_BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Number</label>
              <input
                type="text" inputMode="numeric" maxLength={10} value={payout.bankAccountNumber}
                onChange={(e) => { setPayout((p) => ({ ...p, bankAccountNumber: e.target.value.replace(/\D/g, '') })); setPayoutSaved(false) }}
                placeholder={maskedAccountNumber || '10-digit account number'}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Name</label>
              <input
                type="text" value={payout.bankAccountName}
                onChange={(e) => { setPayout((p) => ({ ...p, bankAccountName: e.target.value })); setPayoutSaved(false) }}
                placeholder="Must match your ID"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all"
              />
            </div>
          </div>
          {payoutError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{payoutError}</p>
            </div>
          )}
          <div className="flex justify-end">
            <SaveButton onClick={savePayout} saved={payoutSaved} loading={payoutLoading} label="Update Payout Account" />
          </div>
        </Section>

        <Section title="Verification Status" icon={ShieldCheck}>
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-4">
            <div className="flex items-center gap-3">
              <VerificationIcon className="w-5 h-5 text-gray-500" />
              <p className="text-sm text-gray-700">Your landlord account verification</p>
            </div>
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${verificationConfig.badge}`}>{verificationConfig.label}</span>
          </div>
          {profile.verificationStatus !== 'approved' && (
            <p className="text-xs text-gray-500 mt-3">
              Document upload/resubmission is handled on the{' '}
              <a href="/landlord/kyc" className="text-orange-500 hover:underline">KYC page</a>.
            </p>
          )}
        </Section>

        <Section title="Notification Preferences" icon={Bell}>
          <p className="text-xs text-gray-500 mb-4">Preferences shown here are not yet persisted to your account — coming soon.</p>
          <div className="flex flex-col">
            {[
              { key: 'newBookingRequests', label: 'New Booking Requests' },
              { key: 'paymentReleased', label: 'Payment Released' },
              { key: 'disputesFiled', label: 'Disputes Filed' },
              { key: 'leaseExpiryReminders', label: 'Lease Expiry Reminders' },
              { key: 'platformUpdates', label: 'Platform Updates' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <button
                  role="switch" aria-checked={notifs[key]} onClick={() => toggleNotif(key)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${notifs[key] ? 'bg-orange-500' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${notifs[key] ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </LandlordLayout>
  )
}