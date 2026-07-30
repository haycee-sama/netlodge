// app/landlord/profile/page.jsx
// Landlord Profile & Settings — /landlord/profile
// Business info, payout bank account, KYC document management,
// and notification preferences for landlords

'use client'

import { useState } from 'react'
import LandlordLayout from '../components/LandlordLayout'
import {
  Building2,
  Mail,
  Phone,
  CreditCard,
  FileCheck,
  Bell,
  Save,
  CheckCircle,
  Upload,
  X,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'

// ── Mock landlord data — replace with real API data later ──────
const INITIAL_BUSINESS = {
  businessName: 'Okafor Properties Ltd',
  contactName:  'Mr. Emeka Okafor',
  email:        'emeka@gmail.com',
  phone:        '08012345678',
}

const INITIAL_PAYOUT = {
  bankName:      'GTBank',
  accountNumber: '0123456789',
  accountName:   'Emeka Okafor',
}

const NIGERIAN_BANKS = [
  'GTBank', 'Access Bank', 'Zenith Bank', 'First Bank',
  'UBA', 'Sterling Bank', 'Fidelity Bank', 'Union Bank',
]

const INITIAL_NOTIFS = {
  newBookingRequests: true,
  paymentReleased:    true,
  disputesFiled:      true,
  leaseExpiryReminders: true,
  platformUpdates:    false,
}

// KYC document status — read-only summary, links out to re-upload
const KYC_DOCS = [
  { label: 'Government ID',            status: 'Verified' },
  { label: 'Certificate of Occupancy', status: 'Verified' },
  { label: 'Geo-Tagged Photos',        status: 'Verified' },
]

// ── Shared sub-components ───────────────────────────────────────

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

function FormField({ label, name, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all"
      />
    </div>
  )
}

function Toggle({ label, sublabel, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-orange-500' : 'bg-gray-200'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${
          checked ? 'left-6' : 'left-1'
        }`} />
      </button>
    </div>
  )
}

function SaveButton({ onClick, saved, label = 'Save Changes' }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all ${
        saved ? 'bg-green-500 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
      }`}
    >
      {saved ? (<><CheckCircle className="w-4 h-4" /> Saved!</>) : (<><Save className="w-4 h-4" /> {label}</>)}
    </button>
  )
}

// ── Main Component ──────────────────────────────────────────────

export default function LandlordProfilePage() {

  const [business, setBusiness]       = useState(INITIAL_BUSINESS)
  const [businessSaved, setBusinessSaved] = useState(false)

  const [payout, setPayout]           = useState(INITIAL_PAYOUT)
  const [payoutSaved, setPayoutSaved] = useState(false)

  const [notifs, setNotifs]           = useState(INITIAL_NOTIFS)
  const [notifSaved, setNotifSaved]   = useState(false)

  const [reuploadFile, setReuploadFile] = useState(null)

  function handleBusinessChange(e) {
    const { name, value } = e.target
    setBusiness((prev) => ({ ...prev, [name]: value }))
    setBusinessSaved(false)
  }

  function saveBusiness() {
    // In the real app: PATCH /api/landlord/business
    setBusinessSaved(true)
    setTimeout(() => setBusinessSaved(false), 3000)
  }

  function handlePayoutChange(e) {
    const { name, value } = e.target
    setPayout((prev) => ({ ...prev, [name]: value }))
    setPayoutSaved(false)
  }

  function savePayout() {
    // In the real app: PATCH /api/landlord/payout-account
    setPayoutSaved(true)
    setTimeout(() => setPayoutSaved(false), 3000)
  }

  function toggleNotif(key) {
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }))
    setNotifSaved(false)
  }

  function saveNotifs() {
    // In the real app: PATCH /api/landlord/notifications
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 3000)
  }

  function handleReupload(e) {
    const file = e.target.files[0]
    if (file) setReuploadFile(file)
  }

  return (
    <LandlordLayout
      title="Profile & Settings"
      subtitle="Manage your business info, payouts, and documents"
    >
      <div className="max-w-3xl flex flex-col gap-6">

        {/* ── Business Information ── */}
        <Section title="Business Information" icon={Building2}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <FormField
              label="Business / Property Name"
              name="businessName"
              value={business.businessName}
              onChange={handleBusinessChange}
              placeholder="e.g. Okafor Properties Ltd"
            />
            <FormField
              label="Contact Name"
              name="contactName"
              value={business.contactName}
              onChange={handleBusinessChange}
              placeholder="Your full name"
            />
            <FormField
              label="Email Address"
              name="email"
              type="email"
              value={business.email}
              onChange={handleBusinessChange}
              placeholder="your@email.com"
            />
            <FormField
              label="Phone Number"
              name="phone"
              type="tel"
              value={business.phone}
              onChange={handleBusinessChange}
              placeholder="08012345678"
            />
          </div>
          <div className="flex justify-end">
            <SaveButton onClick={saveBusiness} saved={businessSaved} />
          </div>
        </Section>

        {/* ── Payout Bank Account ── */}
        <Section title="Payout Bank Account" icon={CreditCard}>
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
            <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Escrow releases are sent automatically to this account after each
              booking's 48-hour dispute window closes.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank Name</label>
              <select
                name="bankName"
                value={payout.bankName}
                onChange={handlePayoutChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all"
              >
                {NIGERIAN_BANKS.map((bank) => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>
            <FormField
              label="Account Number"
              name="accountNumber"
              value={payout.accountNumber}
              onChange={handlePayoutChange}
              placeholder="10-digit account number"
            />
            <FormField
              label="Account Name"
              name="accountName"
              value={payout.accountName}
              onChange={handlePayoutChange}
              placeholder="Must match your ID"
            />
          </div>
          <div className="flex justify-end">
            <SaveButton onClick={savePayout} saved={payoutSaved} label="Update Payout Account" />
          </div>
        </Section>

        {/* ── KYC Documents ── */}
        <Section title="KYC Documents" icon={FileCheck}>
          <div className="flex flex-col gap-2 mb-5">
            {KYC_DOCS.map((doc) => (
              <div key={doc.label} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">{doc.label}</span>
                </div>
                <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                  {doc.status}
                </span>
              </div>
            ))}
          </div>

          <p className="text-sm font-medium text-gray-700 mb-2">
            Need to update a document?
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Uploading a new document will trigger a fresh 48-hour manual review
            for that document only. Your existing verified status stays active
            until the review completes.
          </p>

          {reuploadFile ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <FileCheck className="w-5 h-5 text-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{reuploadFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(reuploadFile.size / 1024 / 1024).toFixed(2)} MB — pending submission
                </p>
              </div>
              <button
                onClick={() => setReuploadFile(null)}
                aria-label="Remove selected file"
                className="text-gray-500 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 rounded-xl py-6 cursor-pointer transition-all">
              <Upload className="w-6 h-6 text-gray-500" />
              <p className="text-sm font-medium text-gray-700">Click to re-upload a document</p>
              <p className="text-xs text-gray-500">JPG, PNG, or PDF · Max 10MB</p>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleReupload}
                className="hidden"
              />
            </label>
          )}
        </Section>

        {/* ── Notification Preferences ── */}
        <Section title="Notification Preferences" icon={Bell}>
          <div className="flex flex-col mb-6">
            <Toggle
              label="New Booking Requests"
              sublabel="When a student books a room in one of your properties"
              checked={notifs.newBookingRequests}
              onChange={() => toggleNotif('newBookingRequests')}
            />
            <Toggle
              label="Payment Released"
              sublabel="When escrow funds are released to your bank account"
              checked={notifs.paymentReleased}
              onChange={() => toggleNotif('paymentReleased')}
            />
            <Toggle
              label="Disputes Filed"
              sublabel="Immediate alert when a student files a dispute"
              checked={notifs.disputesFiled}
              onChange={() => toggleNotif('disputesFiled')}
            />
            <Toggle
              label="Lease Expiry Reminders"
              sublabel="30, 14, and 7 days before a tenant's lease ends"
              checked={notifs.leaseExpiryReminders}
              onChange={() => toggleNotif('leaseExpiryReminders')}
            />
            <Toggle
              label="Platform Updates"
              sublabel="New features and policy changes"
              checked={notifs.platformUpdates}
              onChange={() => toggleNotif('platformUpdates')}
            />
          </div>
          <div className="flex justify-end">
            <SaveButton onClick={saveNotifs} saved={notifSaved} label="Save Preferences" />
          </div>
        </Section>

      </div>
    </LandlordLayout>
  )
}
