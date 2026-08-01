// app/(student)/dashboard/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../lib/auth'
import { getBookingsByStudent, getSavedRoomsByStudent, getStudentProfileById } from '../../../lib/db/queries'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  // Proxy already blocks unauthenticated/wrong-role requests before this
  // ever runs, but the page checks again — defense in depth, never trust
  // a single layer for authorization.
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') {
    redirect('/login')
  }

  const studentId = session.user.roleRecordId
  if (!studentId) redirect('/login')

  const [bookings, savedRooms, profile] = await Promise.all([
    getBookingsByStudent(studentId),
    getSavedRoomsByStudent(studentId),
    getStudentProfileById(studentId),
  ])

  const activeBooking = bookings.find((b) => b.status === 'Active') ?? null

  return (
    <DashboardClient
      firstName={session.user.firstName}
      profile={profile}
      activeBooking={activeBooking}
      totalBookings={bookings.length}
      savedRoomsPreview={savedRooms.slice(0, 2)}
      savedRoomsCount={savedRooms.length}
    />
  )
}