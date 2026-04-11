// app/landlord/property/new/page.jsx
// Create New Property — /landlord/property/new
// Multi-step form: Property info → Blocks setup → Review

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LandlordLayout from '../../components/LandlordLayout'
import {
  Building2,
  MapPin,
  Plus,
  X,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  AlertCircle,
} from 'lucide-react'

const UNIVERSITIES_BY_CITY = {
  Abuja:  ['University of Abuja', 'NOUN', 'Nile University'],
  Lagos:  ['UNILAG', 'LASU', 'Covenant University', 'Redeemer\'s University'],
  Enugu:  ['UNN', 'ESUT', 'Godfrey Okoye University'],
}

const AMENITY_OPTIONS = [
  '24hr Electricity', 'Generator Backup', 'Solar Power', 'Prepaid Meter',
  'Borehole Water', 'Overhead Tank', 'WiFi', 'Strong Network Coverage',
  '24hr Security', 'CCTV Cameras', 'Gated Estate', 'Parking Space',
  'Shared Kitchen', 'Laundry Area',
]

// Steps in the multi-step form
const STEPS = [
  { id: 1, label: 'Property Info'  },
  { id: 2, label: 'Blocks & Rules' },
  { id: 3, label: 'Review'         },
]

export default function CreatePropertyPage() {

  const router = useRouter()

  const [step, setStep]     = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 form data
  const [info, setInfo] = useState({
    name:           '',
    address:        '',
    city:           '',
    university:     '',
    distanceToGate: '',
    distanceToFaculty: '',
    distanceToMarket:  '',
  })

  // Step 2 form data
  const [blocks, setBlocks]           = useState(['Block A'])
  const [selectedAmenities, setSelectedAmenities] = useState([])
  const [rules, setRules]             = useState([''])

  const [infoErrors, setInfoErrors]   = useState({})

  // ── Info handlers ──────────────────────────────────────────

  function handleInfoChange(e) {
    const { name, value } = e.target
    setInfo((prev) => ({ ...prev, [name]: value }))
    if (infoErrors[name]) setInfoErrors((prev) => ({ ...prev, [name]: '' }))
    // Reset university when city changes
    if (name === 'city') setInfo((prev) => ({ ...prev, city: value, university: '' }))
  }

  function validateInfo() {
    const e = {}
    if (!info.name.trim())           e.name           = 'Required'
    if (!info.address.trim())        e.address        = 'Required'
    if (!info.city)                  e.city           = 'Select a city'
    if (!info.university)            e.university     = 'Select a university'
    if (!info.distanceToGate.trim()) e.distanceToGate = 'Required'
    return e
  }

  function goToStep2() {
    const errs = validateInfo()
    if (Object.keys(errs).length > 0) { setInfoErrors(errs); return }
    setStep(2)
  }

  // ── Block handlers ─────────────────────────────────────────

  function addBlock() {
    const letters = 'ABCDEFGHIJKLMNOP'
    const next    = letters[blocks.length] || `Block ${blocks.length + 1}`
    setBlocks((prev) => [...prev, `Block ${next}`])
  }

  function removeBlock(index) {
    if (blocks.length <= 1) return // must keep at least one
    setBlocks((prev) => prev.filter((_, i) => i !== index))
  }

  function toggleAmenity(amenity) {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    )
  }

  function updateRule(index, value) {
    setRules((prev) => prev.map((r, i) => i === index ? value : r))
  }

  function addRule() {
    setRules((prev) => [...prev, ''])
  }

  function removeRule(index) {
    setRules((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Submit ─────────────────────────────────────────────────

  async function handleSubmit() {
    setLoading(true)
    // In the real app: POST to /api/landlord/properties
    await new Promise((r) => setTimeout(r, 1500))
    router.push('/landlord/properties')
  }

  // ── Shared input style ────────────────────────────────────
  function inputClass(hasError) {
    return `w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all bg-white ${
      hasError
        ? 'border-red-300 focus:ring-red-100'
        : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
    }`
  }

  return (
    <LandlordLayout
      title="Add New Property"
      subtitle="Register a new hostel or property"
    >
      <div className="max-w-2xl mx-auto">

        {/* ── Step Progress ── */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, index) => {
            const isActive   = step === s.id
            const isComplete = step > s.id
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isComplete
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isComplete ? <CheckCircle className="w-5 h-5" /> : s.id}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${
                    isActive ? 'text-orange-500' : isComplete ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`h-0.5 w-8 sm:w-12 ${isComplete ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* ════════════════════════════════
            STEP 1 — Property Information
        ════════════════════════════════ */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5">
            <div>
              <h2 className="font-bold text-gray-900 text-lg mb-1">Property Information</h2>
              <p className="text-sm text-gray-500">Basic details about your property</p>
            </div>

            {/* Property name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Property / Hostel Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={info.name}
                onChange={handleInfoChange}
                placeholder="e.g. Sunrise Hostel"
                className={inputClass(infoErrors.name)}
              />
              {infoErrors.name && (
                <p className="text-xs text-red-500 mt-1">{infoErrors.name}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Property Address <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={info.address}
                onChange={handleInfoChange}
                placeholder="e.g. Plot 34, Gwagwalada, Abuja FCT"
                className={inputClass(infoErrors.address)}
              />
              {infoErrors.address && (
                <p className="text-xs text-red-500 mt-1">{infoErrors.address}</p>
              )}
            </div>

            {/* City + University row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  City <span className="text-red-400">*</span>
                </label>
                <select
                  name="city"
                  value={info.city}
                  onChange={handleInfoChange}
                  className={inputClass(infoErrors.city)}
                >
                  <option value="">Select city</option>
                  {Object.keys(UNIVERSITIES_BY_CITY).map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {infoErrors.city && (
                  <p className="text-xs text-red-500 mt-1">{infoErrors.city}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nearest University <span className="text-red-400">*</span>
                </label>
                <select
                  name="university"
                  value={info.university}
                  onChange={handleInfoChange}
                  disabled={!info.city}
                  className={`${inputClass(infoErrors.university)} ${!info.city ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="">
                    {info.city ? 'Select university' : 'Select city first'}
                  </option>
                  {(UNIVERSITIES_BY_CITY[info.city] || []).map((uni) => (
                    <option key={uni} value={uni}>{uni}</option>
                  ))}
                </select>
                {infoErrors.university && (
                  <p className="text-xs text-red-500 mt-1">{infoErrors.university}</p>
                )}
              </div>
            </div>

            {/* Distance fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: 'distanceToGate',     label: 'Distance to Gate',    placeholder: 'e.g. 5 mins walk', required: true  },
                { name: 'distanceToFaculty',  label: 'Distance to Faculty', placeholder: 'e.g. 8 mins walk', required: false },
                { name: 'distanceToMarket',   label: 'Distance to Market',  placeholder: 'e.g. 10 mins',     required: false },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {field.label}
                    {field.required
                      ? <span className="text-red-400"> *</span>
                      : <span className="text-gray-400 text-xs font-normal"> (optional)</span>
                    }
                  </label>
                  <input
                    type="text"
                    name={field.name}
                    value={info[field.name]}
                    onChange={handleInfoChange}
                    placeholder={field.placeholder}
                    className={inputClass(field.required && infoErrors[field.name])}
                  />
                  {field.required && infoErrors[field.name] && (
                    <p className="text-xs text-red-500 mt-1">{infoErrors[field.name]}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={goToStep2}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
              >
                Next — Blocks & Rules
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            STEP 2 — Blocks, Amenities & Rules
        ════════════════════════════════ */}
        {step === 2 && (
          <div className="flex flex-col gap-5">

            {/* Blocks */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-1">Property Blocks</h2>
              <p className="text-sm text-gray-500 mb-4">
                Add all blocks in your property. You will add individual rooms after creating the property.
              </p>

              <div className="flex flex-col gap-2 mb-4">
                {blocks.map((block, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                      <Building2 className="w-4 h-4 text-orange-500 shrink-0" />
                      <span className="text-sm font-medium text-gray-800">{block}</span>
                    </div>
                    {blocks.length > 1 && (
                      <button
                        onClick={() => removeBlock(index)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addBlock}
                disabled={blocks.length >= 10}
                className="flex items-center gap-2 border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-500 hover:text-orange-600 font-medium text-sm py-2.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Block {blocks.length < 10 ? `(Block ${'ABCDEFGHIJKLMNOP'[blocks.length] || blocks.length + 1})` : '(max 10)'}
              </button>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-1">Property Amenities</h2>
              <p className="text-sm text-gray-500 mb-4">
                Select all amenities available across the property. You can set room-specific amenities when adding rooms.
              </p>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map((amenity) => {
                  const selected = selectedAmenities.includes(amenity)
                  return (
                    <button
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      className={`text-sm px-3 py-2 rounded-xl border-2 transition-all ${
                        selected
                          ? 'border-orange-400 bg-orange-50 text-orange-700 font-semibold'
                          : 'border-gray-100 text-gray-600 hover:border-orange-200'
                      }`}
                    >
                      {selected && '✓ '}{amenity}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* House rules */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-1">House Rules</h2>
              <p className="text-sm text-gray-500 mb-4">
                Rules are displayed on every room listing under your property.
              </p>

              <div className="flex flex-col gap-2 mb-3">
                {rules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => updateRule(index, e.target.value)}
                      placeholder={`Rule ${index + 1} — e.g. No loud music after 10pm`}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all"
                    />
                    {rules.length > 1 && (
                      <button
                        onClick={() => removeRule(index)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addRule}
                className="flex items-center gap-2 text-sm text-orange-500 font-medium hover:underline"
              >
                <Plus className="w-4 h-4" />
                Add another rule
              </button>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 font-semibold px-5 py-3 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
              >
                Review Property
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            STEP 3 — Review & Submit
        ════════════════════════════════ */}
        {step === 3 && (
          <div className="flex flex-col gap-5">

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-5">Review Your Property</h2>

              {/* Property summary */}
              <div className="flex flex-col gap-4">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Property Name', value: info.name },
                    { label: 'City',          value: info.city },
                    { label: 'University',    value: info.university },
                    { label: 'Address',       value: info.address },
                    { label: 'Distance to Gate',    value: info.distanceToGate || '—' },
                    { label: 'Distance to Faculty', value: info.distanceToFaculty || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-gray-800">{value || '—'}</p>
                    </div>
                  ))}
                </div>

                {/* Blocks */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-2">Blocks ({blocks.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {blocks.map((block) => (
                      <span key={block} className="text-sm font-medium bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                        {block}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                {selectedAmenities.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-2">
                      Amenities ({selectedAmenities.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAmenities.map((a) => (
                        <span key={a} className="text-xs bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-full">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rules */}
                {rules.filter((r) => r.trim()).length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-2">House Rules</p>
                    <ul className="flex flex-col gap-1">
                      {rules.filter((r) => r.trim()).map((rule, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>

              {/* Next step notice */}
              <div className="mt-5 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  After creating this property you will be taken to the room management page
                  where you can add individual rooms with photos, pricing, and amenities for each block.
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 font-semibold px-5 py-3 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold px-6 py-3 rounded-xl transition-colors"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Property...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Create Property
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </LandlordLayout>
  )
}