// app/(admin)/admin/disputes/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../../lib/auth'
import { getOpenDisputesForAdmin } from '../../../../lib/actions/admin'
import DisputesQueueClient from './DisputesQueueClient'

export default async function AdminDisputesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const result = await getOpenDisputesForAdmin()
  if ('error' in result) redirect('/login')

  return <DisputesQueueClient disputes={result.disputes} />
}