// app/landlord/property/new/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../../lib/auth'
import { getCitiesWithUniversities, getAmenitiesList } from '../../../../lib/db/queries'
import CreatePropertyClient from './CreatePropertyClient'

export default async function CreatePropertyPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'landlord') redirect('/login')
  if (!session.user.roleRecordId) redirect('/landlord/kyc')

  const [cities, amenities] = await Promise.all([
    getCitiesWithUniversities(),
    getAmenitiesList(),
  ])

  return <CreatePropertyClient cities={cities} amenities={amenities} />
}