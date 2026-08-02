// app/landlord/kyc/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../lib/auth'
import KycClient from './KycClient'

export default async function LandlordKYCPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'landlord') redirect('/login')

  return <KycClient />
}