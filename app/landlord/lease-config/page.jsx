// app/landlord/lease-config/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../lib/auth'
import { getLandlordProfileById } from '../../../lib/db/queries'
import LeaseConfigClient from './LeaseConfigClient'

export default async function LeaseConfigPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'landlord') redirect('/login')
  if (!session.user.roleRecordId) redirect('/landlord/kyc')

  const profile = await getLandlordProfileById(session.user.roleRecordId)
  if (!profile) redirect('/landlord/kyc')

  return <LeaseConfigClient initialLeaseConfig={profile.leaseConfig} />
}