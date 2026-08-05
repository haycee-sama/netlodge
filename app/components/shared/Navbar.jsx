// components/shared/Navbar.jsx
// Single entry point for "which nav renders here" decisions.
//
// The public route group (marketing pages, search, room/property pages)
// is the ONLY place a shared top navbar renders. Student, landlord, and
// admin dashboards are each fully self-contained: they own their own
// sidebar/header (see app/(student)/components/StudentLayout.jsx,
// app/landlord/components/LandlordLayout.jsx, and
// app/(admin)/admin/AdminLayoutClient.jsx) and never import or reach
// this component. This file exists so there is exactly one place that
// decides "logged out -> public nav" instead of that decision being
// re-implemented per route group.

import PublicNavbar from './Navbar'

export default function Navbar({ isLoggedIn, initialNotifications, initialUnreadCount }) {
  // Public pages (this component's only caller) always show the public
  // marketing nav, whether or not the visitor happens to be logged in —
  // role-specific dashboards render their own navigation entirely
  // separately and never delegate to this component.
  return (
    <PublicNavbar
      isLoggedIn={isLoggedIn}
      initialNotifications={initialNotifications}
      initialUnreadCount={initialUnreadCount}
    />
  )
}