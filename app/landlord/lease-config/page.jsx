// app/landlord/lease-config/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../lib/auth'
import LeaseConfigClient from './LeaseConfigClient'

export default async function LeaseConfigPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'landlord') redirect('/login')
  if (!session.user.roleRecordId) redirect('/landlord/kyc')

  return <LeaseConfigClient />
}