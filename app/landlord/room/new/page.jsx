// app/landlord/room/new/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../../lib/auth'
import { getPropertiesByLandlord, getPropertyLandlordId, getPropertyById, getAmenitiesList } from '../../../../lib/db/queries'
import CreateRoomClient from './CreateRoomClient'

export default async function CreateRoomPage({ searchParams }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'landlord') redirect('/login')
  if (!session.user.roleRecordId) redirect('/landlord/kyc')

  const params = await searchParams
  const propertyId = params?.propertyId

  if (propertyId) {
    const ownerLandlordId = await getPropertyLandlordId(propertyId)
    if (!ownerLandlordId || ownerLandlordId !== session.user.roleRecordId) redirect('/landlord/properties')
  }

  const [landlordProperties, amenities] = await Promise.all([
    getPropertiesByLandlord(session.user.roleRecordId),
    getAmenitiesList(),
  ])

  if (landlordProperties.length === 0) redirect('/landlord/property/new')

  const resolvedPropertyId = propertyId || landlordProperties[0].id
  const propertyDetail = await getPropertyById(resolvedPropertyId)
  const existingBlockNames = propertyDetail ? propertyDetail.blocks.map((b) => b.name) : []

  return (
    <CreateRoomClient
      properties={landlordProperties}
      amenities={amenities}
      initialPropertyId={resolvedPropertyId}
      existingBlockNames={existingBlockNames}
    />
  )
}