// app/(admin)/admin/layout.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../lib/auth'
import AdminLayoutClient from './AdminLayoutClient'

export const metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export default async function AdminSegmentLayout({ children }) {
  // Defense in depth beyond proxy.ts — every layer independently checks
  // role rather than trusting the layer above it.
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/login')
  }

  return (
    <AdminLayoutClient firstName={session.user.firstName} lastName={session.user.lastName} email={session.user.email ?? ''}>
      {children}
    </AdminLayoutClient>
  )
}