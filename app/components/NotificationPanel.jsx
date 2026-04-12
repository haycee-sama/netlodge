'use client'
// app/components/NotificationPanel.jsx
// Notification dropdown panel — attached to the bell icon in the
// student dashboard header. Slides down from the bell with a
// smooth animation. Shows last N notifications with per-item
// dismiss and a mark-all-read action.
//
// Props:
//   notifications      — array of notification objects
//   onMarkAllRead      — function to mark all notifications as read
//   onDismiss(id)      — function to remove a specific notification
//   onClose            — function to close the panel

import { useEffect, useRef } from 'react'
import { CheckCircle, AlertCircle, Bell, X, Check } from 'lucide-react'

// Icon per notification type
function NotifIcon({ type }) {
  if (type === 'success') return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
  if (type === 'warning') return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
  return <Bell className="w-4 h-4 text-blue-500 shrink-0" />
}

export default function NotificationPanel({ notifications, onMarkAllRead, onDismiss, onClose }) {
  const panelRef = useRef(null)
  const unread   = notifications.filter(n => !n.read).length

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    // Delay slightly so the open-click doesn't immediately close the panel
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      ref={panelRef}
      className="notif-panel absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-50"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
          {unread > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium"
            >
              <Check className="w-3 h-3" />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close notifications"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
          <Bell className="w-8 h-8 opacity-30" />
          <p className="text-sm">No notifications</p>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`flex items-start gap-3 px-4 py-3 group transition-colors ${
                notif.read ? 'bg-white hover:bg-gray-50' : 'bg-orange-50 hover:bg-orange-100'
              }`}
            >
              <NotifIcon type={notif.type} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-relaxed ${notif.read ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                  {notif.text}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{notif.time}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* Unread dot */}
                {!notif.read && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                )}
                {/* Dismiss button — appears on hover */}
                <button
                  onClick={() => onDismiss(notif.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-center text-gray-400">
          Showing last {notifications.length} notifications
        </p>
      </div>
    </div>
  )
}
