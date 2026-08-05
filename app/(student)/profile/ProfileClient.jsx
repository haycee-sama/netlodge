// app/(student)/profile/ProfileClient.jsx
'use client'

import { useState } from 'react'
import {
  User, Lock, Bell, ShieldCheck, Save, Eye, EyeOff,
  GraduationCap, AlertCircle,
} from 'lucide-react'
import {
  updateStudentProfile, updateStudentPassword, updateNotificationPreferences,
} from '../../../lib/actions/student'
import { useToast } from '../../components/ToastProvider'

const YEARS = ['100 Level', '200 Level', '300 Level', '400 Level', '500 Level', 'Postgraduate']

const INITIAL_LIFESTYLE = {
  sleepSchedule: 'early', noiseLevel: 'quiet', studyHabits: 'home',
  guestsPolicy: 'rarely', cookingHabits: 'yes',
}
const LIFESTYLE_OPTIONS = {
  sleepSchedule: [
    { value: 'early', label: 'Early Bird (sleep before 11pm)' },
    { value: 'late',  label: 'Night Owl (sleep after midnight)' },
  ],
  noiseLevel: [
    { value: 'quiet',    label: 'Quiet - I need silence to focus' },
    { value: 'moderate', label: 'Moderate - some noise is fine' },
    { value: 'lively',   label: 'Lively - I enjoy a social atmosphere' },
  ],
  studyHabits: [
    { value: 'home',    label: 'I mostly study in my room' },
    { value: 'library', label: 'I mostly study at the library' },
    { value: 'both',    label: 'I do both' },
  ],
  guestsPolicy: [
    { value: 'never',  label: 'I prefer no guests' },
    { value: 'rarely', label: 'Guests occasionally are fine' },
    { value: 'often',  label: 'I enjoy having guests regularly' },
  ],
  cookingHabits: [
    { value: 'yes',       label: 'Yes - I cook regularly' },
    { value: 'no',        label: 'No - I eat out or order in' },
    { value: 'sometimes', label: 'Sometimes I cook' },
  ],
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

function FormField({ label, name, type = 'text', value, onChange, error, placeholder, disabled }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} disabled={disabled}
        className={`w-full px-4 py-3 rounded-xl border text-sm transition-all
          ${disabled ? 'bg-gray-50 text-gray-500 border-gray-100 cursor-not-allowed'
            : error ? 'border-red-300 focus:ring-2 focus:ring-red-100 text-gray-800 focus:outline-none'
            : 'border-gray-200 focus:ring-2 focus:ring-orange-100 focus:border-orange-400 text-gray-800 focus:outline-none'}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
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
        role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-orange-500' : 'bg-gray-200'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}

function PillSelector({ options, value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => (
        <button
          key={option.value} onClick={() => onChange(option.value)}
          className={`text-left text-sm px-4 py-3 rounded-xl border-2 transition-all ${
            value === option.value ? 'border-orange-400 bg-orange-50 text-orange-700 font-medium' : 'border-gray-100 text-gray-600 hover:border-gray-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function SaveButton({ onClick, loading, label = 'Save Changes' }) {
  return (
    <button
      onClick={onClick} disabled={loading}
      className="flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white"
    >
      {loading ? 'Saving...' : (<><Save className="w-4 h-4" /> {label}</>)}
    </button>
  )
}

export default function ProfileClient({ profile }) {
  const toast = useToast()

  // ── Profile (course/year/phone) ──
  const [form, setForm] = useState({ course: profile.course, year: profile.yearLevel, phone: profile.phone })
  const [profileErrors, setProfileErrors] = useState({})
  const [profileLoading, setProfileLoading] = useState(false)

  async function saveProfile() {
    const errors = {}
    if (!form.course.trim()) errors.course = 'Required'
    if (!form.year) errors.year = 'Required'
    if (!form.phone.trim()) errors.phone = 'Required'
    if (Object.keys(errors).length > 0) { setProfileErrors(errors); return }

    setProfileLoading(true)
    const result = await updateStudentProfile({ course: form.course, yearLevel: form.year, phone: form.phone })
    setProfileLoading(false)

    if ('error' in result) {
      toast.error(result.error)
      return
    }
    toast.success('Your profile has been updated.')
  }

  // ── Password ──
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [showPasswords, setShowPasswords] = useState({ current: false, newPass: false, confirm: false })
  const [passwordLoading, setPasswordLoading] = useState(false)

  function handlePasswordChange(e) {
    const { name, value } = e.target
    setPasswords((prev) => ({ ...prev, [name]: value }))
    if (passwordErrors[name]) setPasswordErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function savePassword() {
    const errors = {}
    if (!passwords.current) errors.current = 'Enter your current password'
    if (!passwords.newPass) errors.newPass = 'Enter a new password'
    if (passwords.newPass && passwords.newPass.length < 8) errors.newPass = 'Must be at least 8 characters'
    if (passwords.newPass !== passwords.confirm) errors.confirm = 'Passwords do not match'
    if (Object.keys(errors).length > 0) { setPasswordErrors(errors); return }

    setPasswordLoading(true)
    const result = await updateStudentPassword({ currentPassword: passwords.current, newPassword: passwords.newPass })
    setPasswordLoading(false)

    if ('error' in result) {
      setPasswordErrors({ current: result.error })
      toast.error(result.error)
      return
    }
    setPasswords({ current: '', newPass: '', confirm: '' })
    toast.success('Your password has been updated.')
  }

  // ── Notifications ──
  const [notifs, setNotifs] = useState(profile.notificationPreferences)
  const [notifLoading, setNotifLoading] = useState(false)

  function toggleNotif(key) {
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function saveNotifs() {
    setNotifLoading(true)
    const result = await updateNotificationPreferences(notifs)
    setNotifLoading(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    toast.success('Notification preferences saved.')
  }

  // ── Lifestyle (not persisted server-side yet) ──
  const [lifestyle, setLifestyle] = useState(INITIAL_LIFESTYLE)
  function updateLifestyle(key, value) { setLifestyle((prev) => ({ ...prev, [key]: value })) }
  function saveLifestyle() { toast.success('Lifestyle preferences saved for this session.') }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-orange-500">{profile.firstName.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{profile.firstName} {profile.lastName}</h1>
                {profile.verified && (
                  <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                  </div>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-0.5">{profile.yearLevel} · {profile.course} · {profile.university}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">

        <Section title="Personal Information" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <FormField label="Email Address" name="email" value={profile.email} disabled />
            <FormField
              label="Phone Number" name="phone" type="tel" value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              error={profileErrors.phone} placeholder="08012345678"
            />
            <FormField label="University" name="university" value={profile.university} disabled />
            <FormField
              label="Course / Department" name="course" value={form.course}
              onChange={(e) => setForm((p) => ({ ...p, course: e.target.value }))}
              error={profileErrors.course} placeholder="e.g. Engineering"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
            <select
              value={form.year}
              onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {profileErrors.year && <p className="text-xs text-red-500 mt-1">{profileErrors.year}</p>}
          </div>

          <div className="flex items-start gap-2 mb-6">
            <AlertCircle className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">University cannot be changed after verification. Contact support if you transferred schools.</p>
          </div>

          <div className="flex justify-end">
            <SaveButton onClick={saveProfile} loading={profileLoading} />
          </div>
        </Section>

        <Section title="Change Password" icon={Lock}>
          <div className="flex flex-col gap-4 mb-6">
            {[
              { name: 'current', label: 'Current Password', placeholder: 'Enter current password' },
              { name: 'newPass', label: 'New Password', placeholder: 'Minimum 8 characters' },
              { name: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password' },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                <div className="relative">
                  <input
                    type={showPasswords[field.name] ? 'text' : 'password'}
                    name={field.name} value={passwords[field.name]} onChange={handlePasswordChange}
                    placeholder={field.placeholder}
                    className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                      passwordErrors[field.name] ? 'border-red-300 focus:ring-red-100 text-gray-800' : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400 text-gray-800'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((p) => ({ ...p, [field.name]: !p[field.name] }))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"
                  >
                    {showPasswords[field.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors[field.name] && <p className="text-xs text-red-500 mt-1">{passwordErrors[field.name]}</p>}
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <SaveButton onClick={savePassword} loading={passwordLoading} label="Update Password" />
          </div>
        </Section>

        <Section title="Notification Preferences" icon={Bell}>
          <div className="flex flex-col mb-6">
            <Toggle label="Booking Updates" sublabel="Confirmations, cancellations, and status changes" checked={notifs.bookingUpdates} onChange={() => toggleNotif('bookingUpdates')} />
            <Toggle label="Payment Receipts" sublabel="Email receipt after every payment" checked={notifs.paymentReceipts} onChange={() => toggleNotif('paymentReceipts')} />
            <Toggle label="Lease Reminders" sublabel="30, 14, and 7 days before your lease ends" checked={notifs.leaseReminders} onChange={() => toggleNotif('leaseReminders')} />
            <Toggle label="New Listings" sublabel="When new verified rooms are added near your university" checked={notifs.newListings} onChange={() => toggleNotif('newListings')} />
            <Toggle label="Promotions & Offers" sublabel="Special deals and referral bonuses" checked={notifs.promotions} onChange={() => toggleNotif('promotions')} />
            <Toggle label="SMS Alerts" sublabel="Receive critical updates via SMS as well as email" checked={notifs.smsAlerts} onChange={() => toggleNotif('smsAlerts')} />
          </div>
          <div className="flex justify-end">
            <SaveButton onClick={saveNotifs} loading={notifLoading} label="Save Preferences" />
          </div>
        </Section>

        <Section title="Lifestyle Preferences" icon={GraduationCap}>
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800 mb-0.5">AI Room Matching - Coming Soon</p>
              <p className="text-xs text-blue-600">These preferences are not yet persisted server-side - a future update will add a dedicated table once the matching engine ships.</p>
            </div>
          </div>

          <div className="flex flex-col gap-6 mb-6">
            {Object.entries(LIFESTYLE_OPTIONS).map(([key, options]) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-gray-700 mb-2 capitalize">
                  {key.replace(/([A-Z])/g, ' $1')}
                </label>
                <PillSelector options={options} value={lifestyle[key]} onChange={(v) => updateLifestyle(key, v)} />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <SaveButton onClick={saveLifestyle} label="Save Lifestyle Prefs" />
          </div>
        </Section>

        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <h2 className="font-bold text-red-600 mb-4">Danger Zone</h2>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Delete My Account</p>
              <p className="text-xs text-gray-500 mt-0.5">Permanently delete your Netlodge account and all associated data. This cannot be undone. Active bookings must be resolved first.</p>
            </div>
            <button className="shrink-0 text-sm font-semibold text-red-500 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors">
              Delete Account
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}