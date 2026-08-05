// app/(admin)/admin/properties/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../../lib/auth'
import { getAllPropertiesForAdmin } from '../../../../lib/db/queries'
import AdminLayout from '../../components/AdminLayout'
import PropertyModerationClient from './PropertyModerationClient'

export default async function AdminPropertiesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const properties = await getAllPropertiesForAdmin()

  return (
    <AdminLayout title="Properties" subtitle={`${properties.length} properties on the platform`}>
      <PropertyModerationClient properties={properties} />
    </AdminLayout>
  )
}