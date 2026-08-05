// app/components/ToastProvider.jsx
'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const CARD_STYLES = {
  success: 'bg-white border-green-200',
  error: 'bg-white border-red-200',
  info: 'bg-white border-blue-200',
}

const TEXT_STYLES = {
  success: 'text-gray-800',
  error: 'text-gray-800',
  info: 'text-gray-800',
}

const ICON_COLORS = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
}

let nextId = 1

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timeoutsRef = useRef({})

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id])
      delete timeoutsRef.current[id]
    }
  }, [])

  const addToast = useCallback((type, message, durationMs = 4000) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, type, message }])
    timeoutsRef.current[id] = setTimeout(() => removeToast(id), durationMs)
    return id
  }, [removeToast])

  const value = {
    addToast,
    success: (message, durationMs) => addToast('success', message, durationMs),
    error: (message, durationMs) => addToast('error', message, durationMs),
    info: (message, durationMs) => addToast('info', message, durationMs),
    dismiss: removeToast,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0 pointer-events-none">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] ?? Info
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 border rounded-xl shadow-lg px-4 py-3 ${CARD_STYLES[toast.type] ?? CARD_STYLES.info}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${ICON_COLORS[toast.type] ?? ICON_COLORS.info}`} />
              <p className={`text-sm flex-1 ${TEXT_STYLES[toast.type] ?? TEXT_STYLES.info}`}>{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                className="text-gray-500 hover:text-gray-600 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}