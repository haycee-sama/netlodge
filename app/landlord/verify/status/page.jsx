// app/landlord/verify/status/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../../lib/auth'
import { getLandlordProfileById } from '../../../../lib/db/queries'
import LandlordVerifyStatusClient from './LandlordVerifyStatusClient'

export default async function LandlordVerifyStatusPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'landlord') redirect('/login')
  const landlordId = session.user.roleRecordId
  if (!landlordId) redirect('/landlord/kyc')

  const profile = await getLandlordProfileById(landlordId)
  if (!profile) redirect('/landlord/kyc')

  return <LandlordVerifyStatusClient status={profile.verificationStatus} />
}