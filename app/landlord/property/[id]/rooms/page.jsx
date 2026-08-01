// app/landlord/property/[id]/rooms/page.jsx
import { redirect, notFound } from 'next/navigation'
import { auth } from '../../../../../lib/auth'
import { getPropertyById, getPropertyLandlordId } from '../../../../../lib/db/queries'
import LandlordRoomsClient from './LandlordRoomsClient'

export default async function LandlordRoomsPage({ params }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'landlord') redirect('/login')

  const { id } = await params
  const ownerLandlordId = await getPropertyLandlordId(id)
  if (!ownerLandlordId) notFound()
  if (ownerLandlordId !== session.user.roleRecordId) redirect('/landlord/properties')

  const property = await getPropertyById(id)
  if (!property) notFound()

  return <LandlordRoomsClient property={property} propertyId={id} />
}