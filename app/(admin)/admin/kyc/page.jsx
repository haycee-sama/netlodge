// app/(admin)/admin/kyc/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../../lib/auth'
import { getPendingKycSubmissions } from '../../../../lib/actions/admin'
import KycQueueClient from './KycQueueClient'

export default async function AdminKycPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const result = await getPendingKycSubmissions()
  if ('error' in result) redirect('/login')

  return <KycQueueClient submissions={result.submissions} />
}