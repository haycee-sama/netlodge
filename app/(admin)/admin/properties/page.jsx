// app/(admin)/admin/properties/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../../lib/auth'
import { getAllPropertiesForAdmin } from '../../../../lib/actions/admin'
import PropertiesModerationClient from './PropertiesModerationClient'

export default async function AdminPropertiesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const result = await getAllPropertiesForAdmin()
  if ('error' in result) redirect('/login')

  return <PropertiesModerationClient properties={result.properties} />
}