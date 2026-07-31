'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Building2, Expand } from 'lucide-react'
import ImageGalleryModal from './ImageGalleryModal'

export default function RoomImageCarousel({ images }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const thumbRefs = useRef([])
  const shouldReduceMotion = useReducedMotion()

  if (!images || images.length === 0) {
    return (
      <div className="h-64 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center">
        <Building2 className="w-16 h-16 text-gray-400" />
      </div>
    )
  }

  function goTo(index) {
    setActiveIndex(index)
    thumbRefs.current[index]?.scrollIntoView({
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }

  function handleDragEnd(_, info) {
    const threshold = 60
    if (info.offset.x < -threshold && activeIndex < images.length - 1) {
      goTo(activeIndex + 1)
    } else if (info.offset.x > threshold && activeIndex > 0) {
      goTo(activeIndex - 1)
    }
  }

  const activeImage = images[activeIndex]

  return (
    <div>
      {/* Live region — announces the current photo for keyboard/SR
          users the same way a sighted user sees the swipe update */}
      <div aria-live="polite" className="sr-only">
        Photo {activeIndex + 1} of {images.length}: {activeImage.alt}
      </div>

      {/* Main carousel */}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Room photos"
        className="relative h-64 sm:h-96 rounded-2xl overflow-hidden bg-gray-100"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={activeImage.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${activeIndex + 1} of ${images.length}`}
            drag={images.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <Image
              src={activeImage.url}
              alt={activeImage.alt}
              fill
              sizes="(max-width: 640px) 100vw, 700px"
              className="object-cover pointer-events-none"
              priority
            />
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => setModalOpen(true)}
          aria-label={`Expand photo ${activeIndex + 1} of ${images.length} to full screen`}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white text-xs px-3 py-2 rounded-full transition-colors"
        >
          <Expand className="w-3.5 h-3.5" />
          {activeIndex + 1} / {images.length}
        </button>
      </div>

      {/* Thumbnail strip — horizontally scrollable, never wraps */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {images.map((image, index) => {
            const isActive = index === activeIndex
            return (
              <button
                key={image.id}
                ref={(el) => (thumbRefs.current[index] = el)}
                onClick={() => goTo(index)}
                aria-label={`Go to photo ${index + 1} of ${images.length}`}
                aria-current={isActive}
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 transition-all ${
                  isActive
                    ? 'ring-2 ring-orange-500 ring-offset-2'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            )
          })}
        </div>
      )}

      <ImageGalleryModal
        images={images}
        activeIndex={activeIndex}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onNavigate={setActiveIndex}
      />
    </div>
  )
}