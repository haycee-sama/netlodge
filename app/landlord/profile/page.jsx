// app/landlord/profile/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../lib/auth'
import { getLandlordProfileById } from '../../../lib/db/queries'
import { decryptAccountNumberFromBase64 } from '../../../lib/crypto/bankAccount'
import LandlordProfileClient from './LandlordProfileClient'

export default async function LandlordProfilePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'landlord') redirect('/login')
  const landlordId = session.user.roleRecordId
  if (!landlordId) redirect('/landlord/kyc')

  const profile = await getLandlordProfileById(landlordId)
  if (!profile) redirect('/landlord/kyc')

  let maskedAccountNumber = ''
  if (profile.bankAccountNumberEncrypted) {
    try {
      const full = decryptAccountNumberFromBase64(profile.bankAccountNumberEncrypted)
      maskedAccountNumber = `•••• ${full.slice(-4)}`
    } catch {
      maskedAccountNumber = '•••• ????'
    }
  }

  // Strip the encrypted field — it must never reach the client bundle.
  const { bankAccountNumberEncrypted, ...safeProfile } = profile

  return <LandlordProfileClient profile={safeProfile} maskedAccountNumber={maskedAccountNumber} />
}