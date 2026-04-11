// app/profile/page.jsx
// Student Profile & Settings — /profile
// Student can update personal info, change password,
// manage notification preferences, and set lifestyle preferences
// Lifestyle prefs feed into the AI matching engine (Phase 2)

'use client'

import { useState } from 'react'
import {
  User,
  Mail,
  Phone,
  Lock,
  Bell,
  ShieldCheck,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  GraduationCap,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Wifi,
  AlertCircle,
} from 'lucide-react'

// ── Mock student data ─────────────────────────────────────────
const INITIAL_PROFILE = {
  firstName:  'Amara',
  lastName:   'Okonkwo',
  email:      'amara@gmail.com',
  phone:      '08012345678',
  university: 'University of Abuja',
  course:     'Engineering',
  year:       '200 Level',
  uniEmail:   'amara@uniabuja.edu.ng',
}

// Notification preference toggles
const INITIAL_NOTIFS = {
  bookingUpdates:   true,
  paymentReceipts:  true,
  leaseReminders:   true,
  newListings:      false,
  promotions:       false,
  smsAlerts:        true,
}

// Lifestyle preferences — used by AI matching engine in Phase 2
const INITIAL_LIFESTYLE = {
  sleepSchedule:  'early',   // early | late
  noiseLevel:     'quiet',   // quiet | moderate | lively
  studyHabits:    'home',    // home | library | both
  guestsPolicy:   'rarely',  // never | rarely | often
  cookingHabits:  'yes',     // yes | no | sometimes
}

// Options for each lifestyle preference
const LIFESTYLE_OPTIONS = {
  sleepSchedule: [
    { value: 'early', label: '🌙 Early Bird (sleep before 11pm)' },
    { value: 'late',  label: '🦉 Night Owl (sleep after midnight)' },
  ],
  noiseLevel: [
    { value: 'quiet',    label: '🤫 Quiet — I need silence to focus' },
    { value: 'moderate', label: '🎵 Moderate — some noise is fine' },
    { value: 'lively',   label: '🎉 Lively — I enjoy a social atmosphere' },
  ],
  studyHabits: [
    { value: 'home',    label: '🏠 I mostly study in my room' },
    { value: 'library', label: '📚 I mostly study at the library' },
    { value: 'both',    label: '🔄 I do both' },
  ],
  guestsPolicy: [
    { value: 'never',  label: '🚫 I prefer no guests' },
    { value: 'rarely', label: '👤 Guests occasionally are fine' },
    { value: 'often',  label: '👥 I enjoy having guests regularly' },
  ],
  cookingHabits: [
    { value: 'yes',       label: '👨‍🍳 Yes — I cook regularly' },
    { value: 'no',        label: '🍔 No — I eat out or order in' },
    { value: 'sometimes', label: '🥡 Sometimes I cook' },
  ],
}

// ── Sub-components ────────────────────────────────────────────

// Section wrapper with title
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

// Form input with label and error
function FormField({ label, name, type = 'text', value, onChange, error, placeholder, disabled }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-xl border text-sm transition-all
          ${disabled
            ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'
            : error
            ? 'border-red-300 focus:ring-2 focus:ring-red-100 text-gray-800 focus:outline-none'
            : 'border-gray-200 focus:ring-2 focus:ring-orange-100 focus:border-orange-400 text-gray-800 focus:outline-none'
          }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// Toggle switch component
function Toggle({ label, sublabel, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      <button
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

// Lifestyle option pill selector
function PillSelector({ options, value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`text-left text-sm px-4 py-3 rounded-xl border-2 transition-all ${
            value === option.value
              ? 'border-orange-400 bg-orange-50 text-orange-700 font-medium'
              : 'border-gray-100 text-gray-600 hover:border-gray-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────

export default function ProfilePage() {

  // Profile form state
  const [profile, setProfile]   = useState(INITIAL_PROFILE)
  const [profileErrors, setProfileErrors] = useState({})
  const [profileSaved, setProfileSaved]   = useState(false)

  // Password form state
  const [passwords, setPasswords] = useState({
    current: '', newPass: '', confirm: '',
  })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [showPasswords, setShowPasswords]   = useState({
    current: false, newPass: false, confirm: false,
  })
  const [passwordSaved, setPasswordSaved] = useState(false)

  // Notification prefs state
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS)
  const [notifSaved, setNotifSaved] = useState(false)

  // Lifestyle prefs state
  const [lifestyle, setLifestyle] = useState(INITIAL_LIFESTYLE)
  const [lifestyleSaved, setLifestyleSaved] = useState(false)

  // ── Profile handlers ──────────────────────────────────────

  function handleProfileChange(e) {
    const { name, value } = e.target
    setProfile((prev) => ({ ...prev, [name]: value }))
    if (profileErrors[name]) {
      setProfileErrors((prev) => ({ ...prev, [name]: '' }))
    }
    setProfileSaved(false)
  }

  function validateProfile() {
    const e = {}
    if (!profile.firstName.trim()) e.firstName = 'Required'
    if (!profile.lastName.trim())  e.lastName  = 'Required'
    if (!profile.phone.trim())     e.phone     = 'Required'
    if (!profile.course.trim())    e.course    = 'Required'
    if (profile.email && !/\S+@\S+\.\S+/.test(profile.email)) {
      e.email = 'Enter a valid email'
    }
    return e
  }

  function saveProfile() {
    const errors = validateProfile()
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors)
      return
    }
    // In the real app: PATCH /api/student/profile
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  // ── Password handlers ─────────────────────────────────────

  function handlePasswordChange(e) {
    const { name, value } = e.target
    setPasswords((prev) => ({ ...prev, [name]: value }))
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: '' }))
    }
    setPasswordSaved(false)
  }

  function toggleShowPassword(field) {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  function validatePassword() {
    const e = {}
    if (!passwords.current)              e.current = 'Enter your current password'
    if (!passwords.newPass)              e.newPass  = 'Enter a new password'
    if (passwords.newPass.length < 8 && passwords.newPass)
                                         e.newPass  = 'Must be at least 8 characters'
    if (passwords.newPass !== passwords.confirm)
                                         e.confirm  = 'Passwords do not match'
    return e
  }

  function savePassword() {
    const errors = validatePassword()
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }
    // In the real app: POST /api/auth/change-password
    setPasswordSaved(true)
    setPasswords({ current: '', newPass: '', confirm: '' })
    setTimeout(() => setPasswordSaved(false), 3000)
  }

  // ── Notif handlers ────────────────────────────────────────

  function toggleNotif(key) {
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }))
    setNotifSaved(false)
  }

  function saveNotifs() {
    // In the real app: PATCH /api/student/notifications
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 3000)
  }

  // ── Lifestyle handlers ────────────────────────────────────

  function updateLifestyle(key, value) {
    setLifestyle((prev) => ({ ...prev, [key]: value }))
    setLifestyleSaved(false)
  }

  function saveLifestyle() {
    // In the real app: PATCH /api/student/lifestyle
    setLifestyleSaved(true)
    setTimeout(() => setLifestyleSaved(false), 3000)
  }

  // ── Reusable save button ──────────────────────────────────
  function SaveButton({ onClick, saved, label = 'Save Changes' }) {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-orange-500 hover:bg-orange-600 text-white'
        }`}
      >
        {saved ? (
          <>
            <CheckCircle className="w-4 h-4" />
            Saved!
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            {label}
          </>
        )}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">

            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-orange-500">
                {profile.firstName.charAt(0)}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.firstName} {profile.lastName}
                </h1>
                {/* Verified badge */}
                <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified
                </div>
              </div>
              <p className="text-gray-500 text-sm mt-0.5">
                {profile.year} · {profile.course} · {profile.university}
              </p>
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">

        {/* ════════════════════════════════
            SECTION 1 — Personal Info
        ════════════════════════════════ */}
        <Section title="Personal Information" icon={User}>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <FormField
              label="First Name"
              name="firstName"
              value={profile.firstName}
              onChange={handleProfileChange}
              error={profileErrors.firstName}
              placeholder="First name"
            />
            <FormField
              label="Last Name"
              name="lastName"
              value={profile.lastName}
              onChange={handleProfileChange}
              error={profileErrors.lastName}
              placeholder="Last name"
            />
            <FormField
              label="Email Address"
              name="email"
              type="email"
              value={profile.email}
              onChange={handleProfileChange}
              error={profileErrors.email}
              placeholder="your@email.com"
            />
            <FormField
              label="Phone Number"
              name="phone"
              type="tel"
              value={profile.phone}
              onChange={handleProfileChange}
              error={profileErrors.phone}
              placeholder="08012345678"
            />
          </div>

          {/* University info — some fields are read-only after verification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <FormField
              label="University"
              name="university"
              value={profile.university}
              onChange={handleProfileChange}
              disabled={true}
            />
            <FormField
              label="Course / Department"
              name="course"
              value={profile.course}
              onChange={handleProfileChange}
              error={profileErrors.course}
              placeholder="e.g. Engineering"
            />
          </div>

          {/* Read-only notice */}
          <div className="flex items-start gap-2 mb-6">
            <AlertCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">
              University cannot be changed after verification. Contact support if you transferred schools.
            </p>
          </div>

          <div className="flex justify-end">
            <SaveButton onClick={saveProfile} saved={profileSaved} />
          </div>

        </Section>

        {/* ════════════════════════════════
            SECTION 2 — Change Password
        ════════════════════════════════ */}
        <Section title="Change Password" icon={Lock}>

          <div className="flex flex-col gap-4 mb-6">

            {/* Current password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  name="current"
                  value={passwords.current}
                  onChange={handlePasswordChange}
                  placeholder="Enter current password"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                    passwordErrors.current
                      ? 'border-red-300 focus:ring-red-100 text-gray-800'
                      : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400 text-gray-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword('current')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
              {passwordErrors.current && (
                <p className="text-xs text-red-500 mt-1">{passwordErrors.current}</p>
              )}
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.newPass ? 'text' : 'password'}
                  name="newPass"
                  value={passwords.newPass}
                  onChange={handlePasswordChange}
                  placeholder="Minimum 8 characters"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                    passwordErrors.newPass
                      ? 'border-red-300 focus:ring-red-100 text-gray-800'
                      : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400 text-gray-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword('newPass')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.newPass
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
              {passwordErrors.newPass && (
                <p className="text-xs text-red-500 mt-1">{passwordErrors.newPass}</p>
              )}
            </div>

            {/* Confirm new password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  name="confirm"
                  value={passwords.confirm}
                  onChange={handlePasswordChange}
                  placeholder="Repeat new password"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                    passwordErrors.confirm
                      ? 'border-red-300 focus:ring-red-100 text-gray-800'
                      : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400 text-gray-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword('confirm')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
              {passwordErrors.confirm && (
                <p className="text-xs text-red-500 mt-1">{passwordErrors.confirm}</p>
              )}
            </div>

          </div>

          <div className="flex justify-end">
            <SaveButton
              onClick={savePassword}
              saved={passwordSaved}
              label="Update Password"
            />
          </div>

        </Section>

        {/* ════════════════════════════════
            SECTION 3 — Notifications
        ════════════════════════════════ */}
        <Section title="Notification Preferences" icon={Bell}>

          <div className="flex flex-col mb-6">
            <Toggle
              label="Booking Updates"
              sublabel="Confirmations, cancellations, and status changes"
              checked={notifs.bookingUpdates}
              onChange={() => toggleNotif('bookingUpdates')}
            />
            <Toggle
              label="Payment Receipts"
              sublabel="Email receipt after every payment"
              checked={notifs.paymentReceipts}
              onChange={() => toggleNotif('paymentReceipts')}
            />
            <Toggle
              label="Lease Reminders"
              sublabel="30, 14, and 7 days before your lease ends"
              checked={notifs.leaseReminders}
              onChange={() => toggleNotif('leaseReminders')}
            />
            <Toggle
              label="New Listings"
              sublabel="When new verified rooms are added near your university"
              checked={notifs.newListings}
              onChange={() => toggleNotif('newListings')}
            />
            <Toggle
              label="Promotions & Offers"
              sublabel="Special deals and referral bonuses"
              checked={notifs.promotions}
              onChange={() => toggleNotif('promotions')}
            />
            <Toggle
              label="SMS Alerts"
              sublabel="Receive critical updates via SMS as well as email"
              checked={notifs.smsAlerts}
              onChange={() => toggleNotif('smsAlerts')}
            />
          </div>

          <div className="flex justify-end">
            <SaveButton
              onClick={saveNotifs}
              saved={notifSaved}
              label="Save Preferences"
            />
          </div>

        </Section>

        {/* ════════════════════════════════
            SECTION 4 — Lifestyle Preferences
            Used by AI matching engine (Phase 2)
        ════════════════════════════════ */}
        <Section title="Lifestyle Preferences" icon={GraduationCap}>

          {/* Phase 2 notice */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <Wifi className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800 mb-0.5">
                AI Room Matching — Coming Phase 2
              </p>
              <p className="text-xs text-blue-600">
                These preferences will be used by our AI matching engine to recommend
                rooms and roommates that suit your lifestyle. Fill them in now so your
                recommendations are ready when the feature launches.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6 mb-6">

            {/* Sleep schedule */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sleep Schedule
              </label>
              <PillSelector
                options={LIFESTYLE_OPTIONS.sleepSchedule}
                value={lifestyle.sleepSchedule}
                onChange={(v) => updateLifestyle('sleepSchedule', v)}
              />
            </div>

            {/* Noise level */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Preferred Noise Level
              </label>
              <PillSelector
                options={LIFESTYLE_OPTIONS.noiseLevel}
                value={lifestyle.noiseLevel}
                onChange={(v) => updateLifestyle('noiseLevel', v)}
              />
            </div>

            {/* Study habits */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Study Habits
              </label>
              <PillSelector
                options={LIFESTYLE_OPTIONS.studyHabits}
                value={lifestyle.studyHabits}
                onChange={(v) => updateLifestyle('studyHabits', v)}
              />
            </div>

            {/* Guests policy */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Guests Policy
              </label>
              <PillSelector
                options={LIFESTYLE_OPTIONS.guestsPolicy}
                value={lifestyle.guestsPolicy}
                onChange={(v) => updateLifestyle('guestsPolicy', v)}
              />
            </div>

            {/* Cooking habits */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cooking Habits
              </label>
              <PillSelector
                options={LIFESTYLE_OPTIONS.cookingHabits}
                value={lifestyle.cookingHabits}
                onChange={(v) => updateLifestyle('cookingHabits', v)}
              />
            </div>

          </div>

          <div className="flex justify-end">
            <SaveButton
              onClick={saveLifestyle}
              saved={lifestyleSaved}
              label="Save Lifestyle Prefs"
            />
          </div>

        </Section>

        {/* ════════════════════════════════
            SECTION 5 — Danger Zone
        ════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <h2 className="font-bold text-red-600 mb-4">Danger Zone</h2>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Delete My Account</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Permanently delete your Netlodge account and all associated data.
                This cannot be undone. Active bookings must be resolved first.
              </p>
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