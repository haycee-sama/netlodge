// app/(student)/components/StudentLayout.jsx
// Self-contained sidebar layout for every page inside the (student)
// route group. Mirrors app/landlord/components/LandlordLayout.jsx and
// app/(admin)/admin/AdminLayoutClient.jsx so all three role areas follow
// the same independent-layout pattern instead of the student area
// falling back to the public marketing Navbar with no sidebar at all.
//
// Deliberately imports nothing from the landlord or admin layout
// components — each role's chrome is self-contained.

'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { ShieldCheck, LogOut, Menu, X } from 'lucide-react'
import StudentSidebarNav from './StudentSidebarNav'
import NotificationBell from '../../components/NotificationBell'

export default function StudentLayout({ children }) {
  const [open, setOpen] = useState(false)
  const drawerRef = useRef(null)
  const { data: session } = useSession()

  const firstName = session?.user?.firstName ?? ''
  const lastName = session?.user?.lastName ?? ''
  const displayName = firstName ? `${firstName} ${lastName}`.trim() : 'Student'
  const avatarLetter = firstName ? firstName.charAt(0).toUpperCase() : '?'
  const email = session?.user?.email ?? ''

  useEffect(() => {
    if (!open) return

    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    function handleTabTrap(e) {
      if (e.key !== 'Tab' || !drawerRef.current) return
      const focusable = drawerRef.current.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('keydown', handleTabTrap)
    const firstFocusable = drawerRef.current?.querySelector('a[href], button:not([disabled])')
    firstFocusable?.focus()

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleTabTrap)
    }
  }, [open])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal={open}
        aria-label="Student navigation menu"
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex
        `}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-white">
              Net<span className="text-orange-500">lodge</span>
            </span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-white">{avatarLetter}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{email}</p>
            </div>
          </div>
        </div>

        <StudentSidebarNav onNavigate={() => setOpen(false)} />

        <div className="px-3 py-4 border-t border-gray-800">
          <button
            onClick={() => signOut({ callbackUrl: '/login', redirect: true })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-800 hover:text-white transition-colors w-full text-left"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="lg:flex-1" />
          <NotificationBell selfFetch />
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      </div>
    </div>
  )
}