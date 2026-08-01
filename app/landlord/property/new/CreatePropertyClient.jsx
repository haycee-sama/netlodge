// app/landlord/property/new/CreatePropertyClient.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LandlordLayout from '../../components/LandlordLayout'
import { Building2, Plus, X, CheckCircle, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react'
import { createProperty } from '../../../../lib/actions/landlord'

const STEPS = [
  { id: 1, label: 'Property Info' },
  { id: 2, label: 'Amenities & Rules' },
  { id: 3, label: 'Review' },
]

export default function CreatePropertyClient({ cities, amenities }) {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [info, setInfo] = useState({
    name: '', address: '', cityId: '', universityId: '',
    distanceToGateMinutes: '', distanceToFacultyMinutes: '', distanceToMarketMinutes: '',
  })
  const [selectedAmenityIds, setSelectedAmenityIds] = useState([])
  const [rules, setRules] = useState([''])
  const [infoErrors, setInfoErrors] = useState({})

  const selectedCity = cities.find((c) => c.id === info.cityId)

  function handleInfoChange(e) {
    const { name, value } = e.target
    setInfo((prev) => ({ ...prev, [name]: value, ...(name === 'cityId' ? { universityId: '' } : {}) }))
    if (infoErrors[name]) setInfoErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function validateInfo() {
    const e = {}
    if (!info.name.trim()) e.name = 'Required'
    if (!info.address.trim()) e.address = 'Required'
    if (!info.cityId) e.cityId = 'Select a city'
    if (!info.universityId) e.universityId = 'Select a university'
    if (!info.distanceToGateMinutes.trim()) e.distanceToGateMinutes = 'Required'
    return e
  }

  function goToStep2() {
    const errs = validateInfo()
    if (Object.keys(errs).length > 0) { setInfoErrors(errs); return }
    setStep(2)
  }

  function toggleAmenity(id) {
    setSelectedAmenityIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]))
  }

  function updateRule(index, value) {
    setRules((prev) => prev.map((r, i) => (i === index ? value : r)))
  }
  function addRule() { setRules((prev) => [...prev, '']) }
  function removeRule(index) { setRules((prev) => prev.filter((_, i) => i !== index)) }

  function minutesToMeters(minutes) {
    const n = Number(minutes)
    return n > 0 ? Math.round(n * 80) : undefined // ~80m/min average walking pace
  }

  async function handleSubmit() {
    setLoading(true)
    setSubmitError('')

    const result = await createProperty({
      name: info.name.trim(),
      address: info.address.trim(),
      cityId: info.cityId,
      universityId: info.universityId,
      distanceToGateMeters: minutesToMeters(info.distanceToGateMinutes),
      amenityIds: selectedAmenityIds,
      rules: rules.filter((r) => r.trim()),
    })

    setLoading(false)

    if ('error' in result) {
      setSubmitError(result.error)
      return
    }

    router.push(`/landlord/property/${result.propertyId}/rooms`)
  }

  function inputClass(hasError) {
    return `w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all bg-white ${
      hasError ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
    }`
  }

  const groupedAmenities = amenities.reduce((acc, a) => {
    (acc[a.category] ||= []).push(a)
    return acc
  }, {})

  return (
    <LandlordLayout title="Add New Property" subtitle="Register a new hostel or property">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, index) => {
            const isActive = step === s.id
            const isComplete = step > s.id
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isComplete ? 'bg-green-500 text-white' : isActive ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isComplete ? <CheckCircle className="w-5 h-5" /> : s.id}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${isActive ? 'text-orange-500' : isComplete ? 'text-green-600' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && <div className={`h-0.5 w-8 sm:w-12 ${isComplete ? 'bg-green-500' : 'bg-gray-200'}`} />}
              </div>
            )
          })}
        </div>

        {submitError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5">
            <div>
              <h2 className="font-bold text-gray-900 text-lg mb-1">Property Information</h2>
              <p className="text-sm text-gray-500">Basic details about your property</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Property / Hostel Name <span className="text-red-400">*</span>
              </label>
              <input type="text" name="name" value={info.name} onChange={handleInfoChange} placeholder="e.g. Sunrise Hostel" className={inputClass(infoErrors.name)} />
              {infoErrors.name && <p className="text-xs text-red-500 mt-1">{infoErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Property Address <span className="text-red-400">*</span>
              </label>
              <input type="text" name="address" value={info.address} onChange={handleInfoChange} placeholder="e.g. Plot 34, Gwagwalada, Abuja FCT" className={inputClass(infoErrors.address)} />
              {infoErrors.address && <p className="text-xs text-red-500 mt-1">{infoErrors.address}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City <span className="text-red-400">*</span></label>
                <select name="cityId" value={info.cityId} onChange={handleInfoChange} className={inputClass(infoErrors.cityId)}>
                  <option value="">Select city</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {infoErrors.cityId && <p className="text-xs text-red-500 mt-1">{infoErrors.cityId}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nearest University <span className="text-red-400">*</span></label>
                <select
                  name="universityId" value={info.universityId} onChange={handleInfoChange}
                  disabled={!info.cityId}
                  className={`${inputClass(infoErrors.universityId)} ${!info.cityId ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="">{info.cityId ? 'Select university' : 'Select city first'}</option>
                  {(selectedCity?.universities ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                {infoErrors.universityId && <p className="text-xs text-red-500 mt-1">{infoErrors.universityId}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: 'distanceToGateMinutes', label: 'Minutes to Gate', required: true },
                { name: 'distanceToFacultyMinutes', label: 'Minutes to Faculty', required: false },
                { name: 'distanceToMarketMinutes', label: 'Minutes to Market', required: false },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {field.label}
                    {field.required ? <span className="text-red-400"> *</span> : <span className="text-gray-500 text-xs font-normal"> (optional)</span>}
                  </label>
                  <input
                    type="number" min="0" name={field.name} value={info[field.name]} onChange={handleInfoChange}
                    placeholder="e.g. 5"
                    className={inputClass(field.required && infoErrors[field.name])}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={goToStep2} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
                Next — Amenities & Rules <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-1">Property Amenities</h2>
              <p className="text-sm text-gray-500 mb-4">Select all amenities available across the property.</p>
              {Object.entries(groupedAmenities).map(([category, items]) => (
                <div key={category} className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((a) => {
                      const selected = selectedAmenityIds.includes(a.id)
                      return (
                        <button
                          key={a.id} onClick={() => toggleAmenity(a.id)}
                          className={`text-sm px-3 py-2 rounded-xl border-2 transition-all ${
                            selected ? 'border-orange-400 bg-orange-50 text-orange-700 font-semibold' : 'border-gray-100 text-gray-600 hover:border-orange-200'
                          }`}
                        >
                          {selected && '✓ '}{a.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-1">House Rules</h2>
              <p className="text-sm text-gray-500 mb-4">Rules are displayed on every room listing under your property.</p>
              <div className="flex flex-col gap-2 mb-3">
                {rules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text" value={rule} onChange={(e) => updateRule(index, e.target.value)}
                      placeholder={`Rule ${index + 1} — e.g. No loud music after 10pm`}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all"
                    />
                    {rules.length > 1 && (
                      <button onClick={() => removeRule(index)} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addRule} className="flex items-center gap-2 text-sm text-orange-500 font-medium hover:underline">
                <Plus className="w-4 h-4" /> Add another rule
              </button>
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 font-semibold px-5 py-3 rounded-xl transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => setStep(3)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors">
                Review Property <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-5">Review Your Property</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'Property Name', value: info.name },
                  { label: 'City', value: selectedCity?.name },
                  { label: 'University', value: selectedCity?.universities.find((u) => u.id === info.universityId)?.name },
                  { label: 'Address', value: info.address },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-gray-800">{value || '—'}</p>
                  </div>
                ))}
              </div>

              {selectedAmenityIds.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 mb-3">
                  <p className="text-xs text-gray-500 mb-2">Amenities ({selectedAmenityIds.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {amenities.filter((a) => selectedAmenityIds.includes(a.id)).map((a) => (
                      <span key={a.id} className="text-xs bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-full">{a.label}</span>
                    ))}
                  </div>
                </div>
              )}

              {rules.filter((r) => r.trim()).length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2">House Rules</p>
                  <ul className="flex flex-col gap-1">
                    {rules.filter((r) => r.trim()).map((rule, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" /> {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-5 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  After creating this property you'll be taken to its room management page,
                  where you can add rooms — each room's block name is set when you create it.
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} disabled={loading} className="flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 font-semibold px-5 py-3 rounded-xl transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold px-6 py-3 rounded-xl transition-colors"
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating Property...</>
                ) : (
                  <><CheckCircle className="w-5 h-5" /> Create Property</>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </LandlordLayout>
  )
}