// app/(student)/layout.jsx
// Wraps student portal pages with Navbar only — no Footer
// (matches the old NO_FOOTER_PREFIXES behavior for these routes)

import Navbar from '../components/Navbar'

export default function StudentLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  )
}