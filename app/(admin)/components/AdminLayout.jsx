// app/(admin)/components/AdminLayout.jsx
'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  ShieldCheck, LayoutDashboard, FileCheck, Building2, ShieldAlert,
  LogOut, Menu, X,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin',            icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/kyc',        icon: FileCheck,       label: 'KYC Approvals' },
  { href: '/admin/properties', icon: Building2,       label: 'Properties' },
  { href: '/admin/disputes',   icon: ShieldAlert,     label: 'Disputes' },
]

export default function AdminLayout({ children, title, subtitle }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const drawerRef = useRef(null)
  const { data: session } = useSession()

  const firstName = session?.user?.firstName ?? ''
  const lastName = session?.user?.lastName ?? ''
  const displayName = firstName ? `${firstName} ${lastName}`.trim() : 'Admin'
  const avatarLetter = firstName ? firstName.charAt(0).toUpperCase() : 'A'
  const email = session?.user?.email ?? ''

  useEffect(() => {
    if (!open) return
    function handleEscape(e) { if (e.key === 'Escape') setOpen(false) }
    function handleTabTrap(e) {
      if (e.key !== 'Tab' || !drawerRef.current) return
      const focusable = drawerRef.current.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
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
        aria-label="Admin navigation menu"
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex
        `}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-800">
          <Link href="/admin" className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-white">
              Net<span className="text-orange-500">lodge</span> <span className="text-gray-500 font-normal text-xs">Admin</span>
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

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href + '/'))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

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

      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="lg:flex-1">
            {title && (
              <div>
                <h1 className="text-lg font-bold text-gray-900">{title}</h1>
                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      </div>
    </div>
  )
}