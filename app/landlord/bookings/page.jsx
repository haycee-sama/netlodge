// app/landlord/bookings/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../lib/auth'
import { getBookingsByLandlord } from '../../../lib/db/queries'
import LandlordBookingsClient from './LandlordBookingsClient'

export default async function LandlordBookingsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'landlord') redirect('/login')
  const landlordId = session.user.roleRecordId
  if (!landlordId) redirect('/landlord/kyc')

  const bookings = await getBookingsByLandlord(landlordId)

  return <LandlordBookingsClient bookings={bookings} />
}