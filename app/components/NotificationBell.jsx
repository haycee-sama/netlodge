// app/components/NotificationBell.jsx
'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { Bell, CheckCircle, AlertCircle, ShieldAlert, Info } from 'lucide-react'
import { markNotificationAsRead, markAllNotificationsAsRead, getMyNotifications, getMyUnreadCount } from '../../lib/actions/notifications'

const TYPE_ICON = {
  booking_confirmed: CheckCircle,
  new_booking: CheckCircle,
  dispute_filed: ShieldAlert,
  dispute_resolved: ShieldAlert,
  kyc_approved: CheckCircle,
  kyc_rejected: AlertCircle,
  general: Info,
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

/**
 * @param {Array|null} initialNotifications - server-fetched initial data, when available
 * @param {number|null} initialUnreadCount - server-fetched initial count, when available
 * @param {boolean} selfFetch - if true, fetches its own data via session-scoped
 *   server actions on mount instead of relying on props. Used in contexts
 *   (like LandlordLayout) where the parent is a client component and can't
 *   fetch server data itself before render.
 */
export default function NotificationBell({ initialNotifications = null, initialUnreadCount = null, selfFetch = false }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications ?? [])
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount ?? 0)
  const [loaded, setLoaded] = useState(!selfFetch)
  const [isPending, startTransition] = useTransition()
  const containerRef = useRef(null)

  useEffect(() => {
    if (!selfFetch || loaded) return
    startTransition(async () => {
      const [notifResult, countResult] = await Promise.all([getMyNotifications(), getMyUnreadCount()])
      if ('items' in notifResult) setNotifications(notifResult.items)
      if ('count' in countResult) setUnreadCount(countResult.count)
      setLoaded(true)
    })
  }, [selfFetch, loaded])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleMarkOne(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    startTransition(async () => {
      await markNotificationAsRead(id)
    })
  }

  function handleMarkAll() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    startTransition(async () => {
      await markAllNotificationsAsRead()
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl border border-gray-100 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-bold text-gray-900 text-sm">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={isPending}
                className="text-xs font-semibold text-orange-500 hover:underline disabled:opacity-50"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!loaded ? (
              <p className="text-sm text-gray-500 text-center py-8">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No notifications yet.</p>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Info
                return (
                  <button
                    key={n.id}
                    onClick={() => !n.isRead && handleMarkOne(n.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0 transition-colors ${
                      n.isRead ? 'bg-white' : 'bg-orange-50 hover:bg-orange-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${n.isRead ? 'text-gray-500' : 'text-orange-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${n.isRead ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>{n.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0 mt-1.5" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}