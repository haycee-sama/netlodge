'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ShieldCheck, Building2, BedDouble, ArrowRight, X, ChevronUp,
} from 'lucide-react'
import Image from 'next/image'

const STATUS_STYLES = {
  Available:   'bg-green-100 text-green-700',
  Booked:      'bg-red-100 text-red-600',
  Maintenance: 'bg-gray-100 text-gray-500',
}
const STATUS_DOTS = {
  Available:   'bg-green-500',
  Booked:      'bg-red-500',
  Maintenance: 'bg-gray-400',
}

// ── Shared detail content ───────────────────────────────────────
// Rendered inside BOTH the desktop sticky sidebar and the mobile
// bottom sheet, so there is exactly one place this markup lives.
function RoomDetailCard({ room, blockName, propertyName }) {
  const hasImage = room.images && room.images.length > 0
  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      <div className="relative h-44 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden">
        {hasImage ? (
          <Image
            src={room.images[0].url}
            alt={room.images[0].alt}
            fill
            sizes="(max-width: 1024px) 100vw, 400px"
            className="object-cover"
            priority
          />
        ) : (
          <Building2 className="w-10 h-10 text-gray-400" />
        )}
        <span className={`absolute top-3 right-3 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[room.status]}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[room.status]}`} />
          {room.status}
        </span>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-lg mb-1">
          Room {room.number} — {room.type}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {blockName} · {room.floor} Floor · {propertyName}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: 'Type', value: room.type },
            { label: 'Bathroom', value: room.bathroom },
            { label: 'Furnished', value: room.furnished === 'Yes' ? 'Yes' : 'No' },
            { label: 'Dimensions', value: room.dimensions },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-xs text-gray-400">Annual rent</p>
            <p className="text-2xl font-bold text-gray-900">₦{room.price.toLocaleString()}</p>
          </div>
          <p className="text-xs text-gray-400 pb-1">+ 7% service fee at checkout</p>
        </div>

        {room.status === 'Available' ? (
          <Link
            href={`/rooms/${room.id}`}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
          >
            View Full Details & Book
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 font-bold py-3.5 rounded-xl text-sm cursor-not-allowed"
          >
            {room.status === 'Booked' ? 'Currently Booked' : 'Under Maintenance'}
          </button>
        )}

        {room.status === 'Available' && (
          <div className="flex items-start gap-2 mt-3 bg-green-50 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <p className="text-xs text-green-700">
              Escrow-protected. Your money is safe for 48 hours after booking.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Desktop-only empty state — mobile never shows this, since it added
// no value below the fold on small screens in the first place.
function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 flex flex-col items-center text-center">
      <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
        <BedDouble className="w-7 h-7 text-orange-400" />
      </div>
      <h3 className="font-bold text-gray-900 mb-2">Select a Room</h3>
      <p className="text-sm text-gray-500 mb-6">
        Click any room card to see its details here.
      </p>
      <div className="flex flex-col gap-2 w-full">
        {Object.entries(STATUS_STYLES).map(([status, style]) => (
          <div key={status} className="flex items-center justify-between">
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${style}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[status]}`} />
              {status}
            </span>
            <span className="text-xs text-gray-400">
              {status === 'Available'   && 'Can be booked'}
              {status === 'Booked'      && 'Already taken'}
              {status === 'Maintenance' && 'Not available'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Mobile bottom sheet ─────────────────────────────────────────
// Opens on-demand only (tap the summary bar), never auto-triggered
// by room selection — reuses the focus-trap/Escape pattern from
// ImageGalleryModal, plus vertical drag-to-dismiss.
function MobileSheet({ room, blockName, propertyName, isOpen, onClose }) {
  const sheetRef = useRef(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!isOpen) return

    function handleKeydown(e) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && sheetRef.current) {
        const focusable = sheetRef.current.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'
    sheetRef.current?.querySelector('button, a[href]')?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  function handleDragEnd(_, info) {
    if (info.offset.y > 100 || info.velocity.y > 500) onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && room && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 lg:hidden"
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Room ${room.number} details`}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto lg:hidden"
          >
            <div className="sticky top-0 bg-white pt-3 pb-2 flex justify-center z-10">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>

            <button
              onClick={onClose}
              aria-label="Close room details"
              className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-4 pb-8">
              <RoomDetailCard room={room} blockName={blockName} propertyName={propertyName} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Mobile sticky summary bar ───────────────────────────────────
// Appears the instant a room is selected — zero scroll, zero
// interruption. This is the direct fix for the reported bug.
function MobileSummaryBar({ room, onExpand }) {
  const shouldReduceMotion = useReducedMotion()
  const hasImage = room?.images && room.images.length > 0

  return (
    <AnimatePresence>
      {room && (
        <motion.button
          onClick={onExpand}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: 'easeOut' }}
          className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4 z-40 lg:hidden bg-gray-900 text-white rounded-2xl shadow-xl px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0 text-left">
            <div className="relative w-10 h-10 rounded-xl bg-orange-500 overflow-hidden shrink-0 flex items-center justify-center">
              {hasImage ? (
                <Image src={room.images[0].url} alt="" fill sizes="40px" className="object-cover" />
              ) : (
                <span className="text-sm font-bold">{room.number}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Room {room.number} — {room.type}</p>
              <p className="text-xs text-gray-300">₦{room.price.toLocaleString()}/yr</p>
            </div>
          </div>
          <span className="flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-3 py-2 rounded-xl shrink-0">
            View <ChevronUp className="w-3.5 h-3.5" />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

// ── Main component ───────────────────────────────────────────────

export default function PropertyBookingPanel({ property }) {
  const [activeBlock, setActiveBlock]   = useState(property.blocks[0].id)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [sheetOpen, setSheetOpen]       = useState(false)

  const currentBlock = property.blocks.find((b) => b.id === activeBlock)

  function handleSelectRoom(room) {
    const isSame = selectedRoom?.id === room.id
    setSelectedRoom(isSame ? null : room)
    if (isSame) setSheetOpen(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* Visually hidden live region — announces selection to screen
          readers regardless of whether the mobile bar or desktop
          panel is what visually changed. */}
      <div aria-live="polite" className="sr-only">
        {selectedRoom
          ? `Room ${selectedRoom.number}, ${selectedRoom.type} selected. ₦${selectedRoom.price.toLocaleString()} per year.`
          : ''}
      </div>

      <div className="lg:col-span-2">
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {property.blocks.map((block) => {
            const blockAvailable = block.rooms.filter((r) => r.status === 'Available').length
            return (
              <button
                key={block.id}
                onClick={() => { setActiveBlock(block.id); setSelectedRoom(null); setSheetOpen(false) }}
                className={`flex flex-col items-center px-5 py-3 rounded-xl border shrink-0 transition-all ${
                  activeBlock === block.id
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                }`}
              >
                <span className="text-sm font-bold">{block.name}</span>
                <span className={`text-xs mt-0.5 ${activeBlock === block.id ? 'text-orange-100' : 'text-green-500'}`}>
                  {blockAvailable} free
                </span>
              </button>
            )
          })}
        </div>

        <p className="text-sm text-gray-500 mb-4">
          <span className="font-medium text-gray-700">{currentBlock.name}</span>
          {' '}· {currentBlock.floor}{' '}· {currentBlock.rooms.length} rooms total
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentBlock.rooms.map((room) => {
            const isSelected = selectedRoom?.id === room.id
            const isBookable = room.status === 'Available'
            return (
              <button
                key={room.id}
                onClick={() => handleSelectRoom(room)}
                className={`text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                  isSelected ? 'border-orange-400 bg-orange-50 shadow-md' : 'border-gray-100 bg-white hover:border-orange-200 hover:shadow-sm'
                } ${!isBookable ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isSelected ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {room.number}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{room.type}</p>
                      <p className="text-xs text-gray-400">{room.floor} Floor</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[room.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[room.status]}`} />
                    {room.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>{room.bathroom}</span><span>·</span>
                    <span>{room.furnished === 'Yes' ? 'Furnished' : 'Unfurnished'}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    ₦{room.price.toLocaleString()}<span className="text-xs font-normal text-gray-400">/yr</span>
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Desktop sticky sidebar — unchanged behavior, lg+ only */}
      <div className="hidden lg:block lg:col-span-1">
        <div className="sticky top-24">
          {selectedRoom ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
              <RoomDetailCard room={selectedRoom} blockName={currentBlock.name} propertyName={property.name} />
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {/* Mobile: instant feedback bar + on-demand full sheet */}
      <MobileSummaryBar room={selectedRoom} onExpand={() => setSheetOpen(true)} />
      <MobileSheet
        room={selectedRoom}
        blockName={currentBlock.name}
        propertyName={property.name}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />

    </div>
  )
}