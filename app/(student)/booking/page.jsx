// app/(student)/booking/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../lib/auth'
import { getBookingsByStudent } from '../../../lib/db/queries'
import BookingsClient from './BookingsClient'

export default async function BookingsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') redirect('/login')

  const studentId = session.user.roleRecordId
  if (!studentId) redirect('/login')

  const bookings = await getBookingsByStudent(studentId)

  return <BookingsClient bookings={bookings} />
}