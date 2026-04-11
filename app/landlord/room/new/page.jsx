// app/landlord/room/new/page.jsx
// Create new room — /landlord/room/new
// Landlord fills in all details for a single room
// Minimum 5 photos, amenities, price, lease options

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LandlordLayout from '../../components/LandlordLayout'
import {
  Upload,
  X,
  CheckCircle,
  ArrowRight,
  Image,
  AlertCircle,
  Plus,
} from 'lucide-react'

// ── Options data ──────────────────────────────────────────────

const ROOM_TYPES   = ['Single', 'Shared', 'Self-Contain']
const FLOOR_OPTIONS = ['Ground', '1st', '2nd', '3rd', '4th']
const BATHROOM_OPTIONS = ['En-suite', 'Shared']
const FURNISHED_OPTIONS = ['Yes', 'No', 'Partially']

const AMENITY_OPTIONS = {
  power:    ['24hr Electricity', 'Generator Backup', 'Solar Power', 'Prepaid Meter', 'No Backup Power'],
  water:    ['Constant Water Supply', 'Borehole Water', 'Overhead Tank', 'Water Sometimes Unavailable'],
  internet: ['WiFi Included', 'Strong Network Coverage', 'No WiFi'],
  security: ['24hr Security', 'CCTV Cameras', 'Gated Estate', 'Key Lock Only'],
  extras:   ['Parking Space', 'Kitchen Access', 'Laundry Area', 'Study Desk Included'],
}

const AMENITY_LABELS = {
  power:    '⚡ Power',
  water:    '💧 Water',
  internet: '📶 Internet',
  security: '🔒 Security',
  extras:   '✨ Extras',
}

const LEASE_OPTIONS_LIST = [
  { id: 'year',     label: '1 Full Year',   desc: 'Standard annual lease' },
  { id: 'semester', label: 'Per Semester',  desc: '2 payments per year'   },
  { id: 'halfYear', label: 'Half Year',     desc: '6-month cycles'        },
]

export default function CreateRoomPage() {

  const router = useRouter()

  const [form, setForm] = useState({
    roomNumber:  '',
    type:        '',
    floor:       '',
    bathroom:    '',
    furnished:   '',
    dimensions:  '',
    price:       '',
    description: '',
  })

  // Selected amenities per category
  const [amenities, setAmenities] = useState({
    power:    [],
    water:    [],
    internet: [],
    security: [],
    extras:   [],
  })

  // Enabled lease options
  const [leaseOptions, setLeaseOptions] = useState(['year'])

  // Uploaded photos — max 10, min 5 required
  const [photos, setPhotos] = useState([])

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // ── Handlers ──────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function toggleAmenity(category, item) {
    setAmenities((prev) => ({
      ...prev,
      [category]: prev[category].includes(item)
        ? prev[category].filter((a) => a !== item)
        : [...prev[category], item],
    }))
  }

  function toggleLease(id) {
    // 1 Year is always required — cannot be unchecked
    if (id === 'year') return
    setLeaseOptions((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    )
  }

  function handlePhotoUpload(e) {
    const newFiles = Array.from(e.target.files)
    const remaining = 10 - photos.length
    const toAdd     = newFiles.slice(0, remaining)

    const photoObjects = toAdd.map((file) => ({
      id:   Math.random().toString(36).slice(2),
      name: file.name,
      size: file.size,
      // In real app: upload to S3/Cloudinary and store URL
      url:  URL.createObjectURL(file),
    }))

    setPhotos((prev) => [...prev, ...photoObjects])
    if (errors.photos) setErrors((prev) => ({ ...prev, photos: '' }))
  }

  function removePhoto(id) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  // ── Validation ────────────────────────────────────────────

  function validate() {
    const e = {}
    if (!form.roomNumber.trim()) e.roomNumber = 'Required'
    if (!form.type)              e.type       = 'Select room type'
    if (!form.floor)             e.floor      = 'Select floor'
    if (!form.bathroom)          e.bathroom   = 'Select bathroom type'
    if (!form.furnished)         e.furnished  = 'Select furnishing status'
    if (!form.price)             e.price      = 'Enter room price'
    if (isNaN(Number(form.price)) || Number(form.price) < 1)
                                 e.price      = 'Enter a valid price'
    if (photos.length < 5)       e.photos     = `Upload at least 5 photos (${photos.length}/5 uploaded)`
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    // In the real app: POST to /api/landlord/rooms
    await new Promise((r) => setTimeout(r, 1500))
    router.push('/landlord/properties')
  }

  // ── Shared classes ────────────────────────────────────────

  function inputClass(hasError) {
    return `w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all bg-white ${
      hasError
        ? 'border-red-300 focus:ring-red-100'
        : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
    }`
  }

  function SelectField({ label, name, options, required }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <select
          name={name}
          value={form[name]}
          onChange={handleChange}
          className={inputClass(errors[name])}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {errors[name] && (
          <p className="text-xs text-red-500 mt-1">{errors[name]}</p>
        )}
      </div>
    )
  }

  return (
    <LandlordLayout
      title="Add New Room"
      subtitle="Fill in all room details — minimum 5 photos required"
    >
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* ── Section 1: Basic Details ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-5">Room Details</h2>

            <div className="flex flex-col gap-4">

              {/* Room number + type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Room Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="roomNumber"
                    value={form.roomNumber}
                    onChange={handleChange}
                    placeholder="e.g. A05"
                    className={inputClass(errors.roomNumber)}
                  />
                  {errors.roomNumber && (
                    <p className="text-xs text-red-500 mt-1">{errors.roomNumber}</p>
                  )}
                </div>
                <SelectField
                  label="Room Type"
                  name="type"
                  options={ROOM_TYPES}
                  required
                />
              </div>

              {/* Floor + Bathroom */}
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Floor"
                  name="floor"
                  options={FLOOR_OPTIONS}
                  required
                />
                <SelectField
                  label="Bathroom"
                  name="bathroom"
                  options={BATHROOM_OPTIONS}
                  required
                />
              </div>

              {/* Furnished + Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Furnished"
                  name="furnished"
                  options={FURNISHED_OPTIONS}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Dimensions
                    <span className="text-gray-400 text-xs font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="dimensions"
                    value={form.dimensions}
                    onChange={handleChange}
                    placeholder="e.g. 4m x 5m"
                    className={inputClass(false)}
                  />
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Annual Rent (₦) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">
                    ₦
                  </span>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="e.g. 180000"
                    className={`${inputClass(errors.price)} pl-8`}
                  />
                </div>
                {errors.price
                  ? <p className="text-xs text-red-500 mt-1">{errors.price}</p>
                  : form.price && (
                    <p className="text-xs text-gray-400 mt-1">
                      = ₦{Number(form.price).toLocaleString()} per year
                    </p>
                  )
                }
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Room Description
                  <span className="text-gray-400 text-xs font-normal ml-1">(optional)</span>
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the room — views, special features, condition..."
                  className={`${inputClass(false)} resize-none`}
                />
              </div>

            </div>
          </div>

          {/* ── Section 2: Photos ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-2">
              <h2 className="font-bold text-gray-900 text-lg">Room Photos</h2>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                photos.length >= 5
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {photos.length}/5 minimum
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Upload at least 5 clear photos of the actual room — not stock images.
              Students need to see exactly what they are booking.
            </p>

            {/* Photo grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
                  >
                    <img
                      src={photo.url}
                      alt={`Room photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Main photo label */}
                    {index === 0 && (
                      <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        Main
                      </div>
                    )}
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload area */}
            {photos.length < 10 && (
              <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-8 cursor-pointer transition-all ${
                errors.photos
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
              }`}>
                <Upload className="w-8 h-8 text-gray-400" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    Click to upload photos
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG or PNG · Max 5MB each · Up to {10 - photos.length} more
                  </p>
                </div>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}

            {errors.photos && (
              <p className="text-xs text-red-500 mt-2">{errors.photos}</p>
            )}
          </div>

          {/* ── Section 3: Amenities ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-2">Room Amenities</h2>
            <p className="text-sm text-gray-500 mb-5">
              Select all amenities that apply specifically to this room.
            </p>

            <div className="flex flex-col gap-5">
              {Object.entries(AMENITY_OPTIONS).map(([category, options]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {AMENITY_LABELS[category]}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                      const selected = amenities[category].includes(option)
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleAmenity(category, option)}
                          className={`text-sm px-3 py-2 rounded-xl border-2 transition-all ${
                            selected
                              ? 'border-orange-400 bg-orange-50 text-orange-700 font-semibold'
                              : 'border-gray-100 text-gray-600 hover:border-orange-200'
                          }`}
                        >
                          {selected && '✓ '}{option}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 4: Lease Options ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-2">Lease Options</h2>
            <p className="text-sm text-gray-500 mb-5">
              1 Year is always required. Optionally unlock shorter lease options for students.
            </p>

            <div className="flex flex-col gap-3">
              {LEASE_OPTIONS_LIST.map((option) => {
                const isEnabled   = leaseOptions.includes(option.id)
                const isForced    = option.id === 'year'
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleLease(option.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      isEnabled
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-gray-100 hover:border-gray-200'
                    } ${isForced ? 'cursor-default' : ''}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      isEnabled ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                    }`}>
                      {isEnabled && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isEnabled ? 'text-orange-700' : 'text-gray-800'}`}>
                        {option.label}
                        {isForced && (
                          <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-normal">
                            Required
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{option.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Room...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Create Room
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </LandlordLayout>
  )
}