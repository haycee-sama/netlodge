// app/(admin)/admin/disputes/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../../lib/auth'
import { getOpenDisputes } from '../../../../lib/db/queries'
import AdminLayout from '../../components/AdminLayout'
import DisputeResolutionClient from './DisputeResolutionClient'

export default async function AdminDisputesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const disputes = await getOpenDisputes()

  return (
    <AdminLayout title="Disputes" subtitle={`${disputes.length} open disputes`}>
      <DisputeResolutionClient disputes={disputes} />
    </AdminLayout>
  )
}