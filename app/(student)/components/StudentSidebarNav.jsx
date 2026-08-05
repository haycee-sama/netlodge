// app/(student)/components/StudentSidebarNav.jsx
// Student portal navigation links. Extracted from the sidebar that used
// to live only inside DashboardClient.jsx (and therefore only appeared
// on the dashboard page, not on booking/saved/profile). Mirrors the
// structure of app/landlord/components/LandlordLayout.jsx's nav list.

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BedDouble, Search, Calendar, Heart, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: BedDouble, label: 'Dashboard' },
  { href: '/search', icon: Search, label: 'Find a Room' },
  { href: '/booking', icon: Calendar, label: 'My Bookings' },
  { href: '/saved', icon: Heart, label: 'Saved Rooms' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export default function StudentSidebarNav({ onNavigate }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
  )
}