// app/(student)/layout.jsx
// Route-group layout for every page under (student). Renders the
// self-contained StudentLayout (sidebar + header, own nav links, own
// sign-out) instead of the generic public Navbar — the student area no
// longer inherits marketing-page chrome or leaves booking/saved/profile
// pages without any consistent navigation.
//
// Does not import anything from the landlord or admin layouts.

import StudentLayout from './components/StudentLayout'

export default function StudentGroupLayout({ children }) {
  return <StudentLayout>{children}</StudentLayout>
}