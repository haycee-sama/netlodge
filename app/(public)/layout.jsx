// app/(public)/layout.jsx
// Wraps all public marketing/browsing pages with Navbar + Footer

import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  )
}