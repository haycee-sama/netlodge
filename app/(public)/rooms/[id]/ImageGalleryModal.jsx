'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function ImageGalleryModal({ images, activeIndex, isOpen, onClose, onNavigate }) {
  const modalRef = useRef(null)
  const shouldReduceMotion = useReducedMotion()

  // Escape to close, arrow key navigation, focus trap, body scroll lock
  useEffect(() => {
    if (!isOpen) return

    function handleKeydown(e) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowRight') {
        onNavigate((activeIndex + 1) % images.length)
        return
      }
      if (e.key === 'ArrowLeft') {
        onNavigate((activeIndex - 1 + images.length) % images.length)
        return
      }

      // Focus trap — same pattern used in LandlordLayout's mobile drawer
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'

    // Move focus into the modal when it opens
    const firstFocusable = modalRef.current?.querySelector('button')
    firstFocusable?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = ''
    }
  }, [isOpen, activeIndex, images.length, onClose, onNavigate])

  function handleDragEnd(_, info) {
    const threshold = 50
    if (info.offset.x < -threshold) {
      onNavigate((activeIndex + 1) % images.length)
    } else if (info.offset.x > threshold) {
      onNavigate((activeIndex - 1 + images.length) % images.length)
    }
  }

  if (!images || images.length === 0) return null

  const activeImage = images[activeIndex]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label="Room photo gallery"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center px-4"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close gallery"
            className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Previous — desktop only, mobile uses swipe */}
          {images.length > 1 && (
            <button
              onClick={() => onNavigate((activeIndex - 1 + images.length) % images.length)}
              aria-label="Previous photo"
              className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Draggable / swipeable image — plain <img>, not next/image,
              to avoid fighting Framer Motion's drag physics */}
          <motion.img
            key={activeImage.id}
            src={activeImage.url}
            alt={activeImage.alt}
            drag={images.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg cursor-grab active:cursor-grabbing select-none"
          />

          {/* Next — desktop only */}
          {images.length > 1 && (
            <button
              onClick={() => onNavigate((activeIndex + 1) % images.length)}
              aria-label="Next photo"
              className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Counter */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {activeIndex + 1} / {images.length}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}