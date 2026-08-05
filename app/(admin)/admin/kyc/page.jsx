// app/(admin)/admin/kyc/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../../lib/auth'
import { getPendingKycUsers } from '../../../../lib/db/queries'
import AdminLayout from '../../components/AdminLayout'
import KycModerationClient from './KycModerationClient'

export default async function AdminKycPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const { students, landlords } = await getPendingKycUsers()

  return (
    <AdminLayout title="KYC Approvals" subtitle={`${students.length + landlords.length} pending submissions`}>
      <KycModerationClient students={students} landlords={landlords} />
    </AdminLayout>
  )
}