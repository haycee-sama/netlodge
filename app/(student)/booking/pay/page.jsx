// app/(student)/booking/pay/page.jsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { auth } from '../../../../lib/auth'
import { getBookingById } from '../../../../lib/db/queries'
import BookingProgress from '../components/BookingProgress'
import PayClient from './PayClient'

export default async function PaymentPage({ searchParams }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') redirect('/login')

  const params = await searchParams
  const bookingId = params?.bookingId

  if (!bookingId) redirect('/search')

  const booking = await getBookingById(bookingId)

  // IDOR guard: a booking exists, but does it belong to the caller?
  // This check is what stands between "any logged-in student" and
  // "specifically the student who owns this booking."
  if (!booking || booking.studentId !== session.user.roleRecordId) {
    return (
      <>
        <BookingProgress step={1} />
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-center px-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <h2 className="text-xl font-bold text-gray-900">Booking not found</h2>
          <p className="text-gray-500 text-sm">This booking does not exist or you do not have access to it.</p>
          <Link href="/search" className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors">
            Back to Search
          </Link>
        </div>
      </>
    )
  }

  if (booking.status !== 'draft') {
    // Already paid, cancelled, or otherwise moved on — send them to the
    // right place instead of re-showing a stale payment form.
    if (booking.status === 'confirmed') redirect(`/booking/success?bookingId=${booking.id}`)
    redirect('/booking')
  }

  // Strip studentId before it ever reaches the client component —
  // it was only needed for the ownership check above.
  const { studentId: _omit, ...safeBooking } = booking

  return <PayClient booking={safeBooking} />
}