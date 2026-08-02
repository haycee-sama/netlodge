// app/landlord/room/new/CreateRoomClient.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LandlordLayout from '../../components/LandlordLayout'
import FileUpload from '../../../components/FileUpload'
import { CheckCircle, ArrowRight, AlertCircle, X, ImageIcon } from 'lucide-react'
import { createRoom, updateRoomLeaseOptions } from '../../../../lib/actions/landlord'

const ROOM_TYPE_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'shared', label: 'Shared' },
  { value: 'self_contain', label: 'Self-Contain' },
]
const FLOOR_OPTIONS = ['Ground', '1st', '2nd', '3rd', '4th']
const BATHROOM_OPTIONS = [{ value: 'ensuite', label: 'En-suite' }, { value: 'shared', label: 'Shared' }]
const FURNISHED_OPTIONS = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'partially', label: 'Partially' }]

const LEASE_OPTIONS_LIST = [
  { id: 'full_year', label: '1 Full Year', desc: 'Standard annual lease', required: true },
  { id: 'per_semester', label: 'Per Semester', desc: '2 payments per year', required: false },
  { id: 'half_year', label: 'Half Year', desc: '6-month cycles', required: false },
]

export default function CreateRoomClient({ properties, amenities, initialPropertyId, existingBlockNames }) {
  const router = useRouter()

  const [propertyId, setPropertyId] = useState(initialPropertyId)
  const [form, setForm] = useState({
    blockName: '', roomNumber: '', roomType: '', floor: '', bathroomType: '', furnished: '', dimensions: '',
  })
  const [selectedAmenityIds, setSelectedAmenityIds] = useState([])
  const [images, setImages] = useState([]) // [{url, alt}]
  const [leasePrices, setLeasePrices] = useState({ full_year: '', per_semester: '', half_year: '' })
  const [enabledLeases, setEnabledLeases] = useState(['full_year'])

  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function toggleAmenity(id) {
    setSelectedAmenityIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]))
  }

  function toggleLease(id) {
    if (id === 'full_year') return
    setEnabledLeases((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]))
  }

  function handleImagesUploaded(uploaded) {
    setImages((prev) => {
      const combined = [...prev, ...uploaded]
      // Generic sequential alt text — landlords can refine copy later
      // once a proper room-editing flow exists; this just needs to be
      // non-empty and reasonably descriptive for accessibility today.
      return combined.map((img, i) => ({ url: img.url, alt: `Room photo ${i + 1}` }))
    })
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index).map((img, i) => ({ ...img, alt: `Room photo ${i + 1}` })))
  }

  function validate() {
    const e = {}
    if (!form.blockName.trim()) e.blockName = 'Required'
    if (!form.roomNumber.trim()) e.roomNumber = 'Required'
    if (!form.roomType) e.roomType = 'Select room type'
    if (!form.bathroomType) e.bathroomType = 'Select bathroom type'
    if (!form.furnished) e.furnished = 'Select furnishing status'
    if (!leasePrices.full_year || Number(leasePrices.full_year) <= 0) e.full_year = 'Enter the annual rent'
    for (const leaseId of enabledLeases) {
      if (leaseId !== 'full_year' && (!leasePrices[leaseId] || Number(leasePrices[leaseId]) <= 0)) {
        e[leaseId] = 'Enter a price for this lease option'
      }
    }
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setSubmitError('')

    const roomResult = await createRoom({
      propertyId,
      blockName: form.blockName.trim(),
      roomNumber: form.roomNumber.trim(),
      roomType: form.roomType,
      floor: form.floor,
      bathroomType: form.bathroomType,
      furnished: form.furnished,
      dimensions: form.dimensions.trim(),
      amenityIds: selectedAmenityIds,
      images,
    })

    if ('error' in roomResult) {
      setLoading(false)
      setSubmitError(roomResult.error)
      return
    }

    const leaseOptionsPayload = LEASE_OPTIONS_LIST
      .filter((opt) => enabledLeases.includes(opt.id))
      .map((opt) => ({ leaseType: opt.id, price: Number(leasePrices[opt.id]), isEnabled: true }))

    const priceResult = await updateRoomLeaseOptions(roomResult.roomId, leaseOptionsPayload)

    setLoading(false)

    if ('error' in priceResult) {
      setSubmitError(`Room created, but pricing failed: ${priceResult.error}`)
      return
    }

    router.push(`/landlord/property/${propertyId}/rooms`)
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
    <LandlordLayout title="Add New Room" subtitle="Fill in the room details, block, and pricing">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {submitError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          {properties.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Property</label>
              <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inputClass(false)}>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-5">Room Details</h2>
            <div className="flex flex-col gap-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Block Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text" name="blockName" list="existing-blocks" value={form.blockName} onChange={handleChange}
                    placeholder="e.g. Block A" className={inputClass(errors.blockName)}
                  />
                  <datalist id="existing-blocks">
                    {existingBlockNames.map((b) => <option key={b} value={b} />)}
                  </datalist>
                  {errors.blockName && <p className="text-xs text-red-500 mt-1">{errors.blockName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Room Number <span className="text-red-400">*</span>
                  </label>
                  <input type="text" name="roomNumber" value={form.roomNumber} onChange={handleChange} placeholder="e.g. A05" className={inputClass(errors.roomNumber)} />
                  {errors.roomNumber && <p className="text-xs text-red-500 mt-1">{errors.roomNumber}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Room Type <span className="text-red-400">*</span></label>
                  <select name="roomType" value={form.roomType} onChange={handleChange} className={inputClass(errors.roomType)}>
                    <option value="">Select room type</option>
                    {ROOM_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {errors.roomType && <p className="text-xs text-red-500 mt-1">{errors.roomType}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Floor</label>
                  <select name="floor" value={form.floor} onChange={handleChange} className={inputClass(false)}>
                    <option value="">Select floor</option>
                    {FLOOR_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bathroom <span className="text-red-400">*</span></label>
                  <select name="bathroomType" value={form.bathroomType} onChange={handleChange} className={inputClass(errors.bathroomType)}>
                    <option value="">Select bathroom type</option>
                    {BATHROOM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {errors.bathroomType && <p className="text-xs text-red-500 mt-1">{errors.bathroomType}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Furnished <span className="text-red-400">*</span></label>
                  <select name="furnished" value={form.furnished} onChange={handleChange} className={inputClass(errors.furnished)}>
                    <option value="">Select furnishing status</option>
                    {FURNISHED_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {errors.furnished && <p className="text-xs text-red-500 mt-1">{errors.furnished}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Dimensions <span className="text-gray-500 text-xs font-normal">(optional)</span></label>
                <input type="text" name="dimensions" value={form.dimensions} onChange={handleChange} placeholder="e.g. 4m x 5m" className={inputClass(false)} />
              </div>

            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Room Photos</h2>
            <p className="text-sm text-gray-500 mb-4">Upload up to 10 photos. Clear, well-lit photos get booked faster.</p>

            <FileUpload
              endpoint="roomImage"
              multiple
              accept="image/*"
              label="JPG or PNG · Up to 10 photos, 4MB each"
              onClientUploadComplete={handleImagesUploaded}
            />

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                {images.map((img, i) => (
                  <div key={img.url} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length === 0 && (
              <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                <ImageIcon className="w-4 h-4" />
                No photos uploaded yet — you can still create the room and add photos later.
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-2">Room Amenities</h2>
            <div className="flex flex-col gap-4">
              {Object.entries(groupedAmenities).map(([category, items]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((a) => {
                      const selected = selectedAmenityIds.includes(a.id)
                      return (
                        <button
                          key={a.id} type="button" onClick={() => toggleAmenity(a.id)}
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
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-2">Lease Options & Pricing</h2>
            <p className="text-sm text-gray-500 mb-5">1 Year is required. Enable and price any additional lease durations.</p>
            <div className="flex flex-col gap-3">
              {LEASE_OPTIONS_LIST.map((option) => {
                const isEnabled = enabledLeases.includes(option.id)
                return (
                  <div key={option.id} className={`rounded-xl border-2 p-4 transition-all ${isEnabled ? 'border-orange-400 bg-orange-50' : 'border-gray-100'}`}>
                    <button
                      type="button" onClick={() => toggleLease(option.id)}
                      className={`flex items-center gap-4 w-full text-left ${option.required ? 'cursor-default' : ''}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isEnabled ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                        {isEnabled && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${isEnabled ? 'text-orange-700' : 'text-gray-800'}`}>
                          {option.label}
                          {option.required && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-normal">Required</span>}
                        </p>
                        <p className="text-xs text-gray-500">{option.desc}</p>
                      </div>
                    </button>
                    {isEnabled && (
                      <div className="mt-3 pl-9">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₦</span>
                          <input
                            type="number" min="1"
                            value={leasePrices[option.id]}
                            onChange={(e) => setLeasePrices((prev) => ({ ...prev, [option.id]: e.target.value }))}
                            placeholder="e.g. 180000"
                            className={`${inputClass(errors[option.id])} pl-8`}
                          />
                        </div>
                        {errors[option.id] && <p className="text-xs text-red-500 mt-1">{errors[option.id]}</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold px-6 py-3 rounded-xl transition-colors">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating Room...</>
              ) : (
                <><CheckCircle className="w-5 h-5" /> Create Room</>
              )}
            </button>
          </div>

        </form>
      </div>
    </LandlordLayout>
  )
}