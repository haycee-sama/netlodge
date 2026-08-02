// app/landlord/payments/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../lib/auth'
import { getBookingsByLandlord } from '../../../lib/db/queries'
import LandlordPaymentsClient from './LandlordPaymentsClient'

export default async function LandlordPaymentsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'landlord') redirect('/login')
  const landlordId = session.user.roleRecordId
  if (!landlordId) redirect('/landlord/kyc')

  const bookings = await getBookingsByLandlord(landlordId)
  // Payments view only cares about bookings that actually collected money.
  const payments = bookings.filter((b) => b.paymentStatus === 'paid')

  return <LandlordPaymentsClient payments={payments} />
}