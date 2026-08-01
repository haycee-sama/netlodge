// app/(auth)/complete-profile/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../lib/auth'
import { getUniversitiesForSignup } from '../../../lib/db/queries'
import CompleteProfileClient from './CompleteProfileClient'

export default async function CompleteProfilePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'student') redirect('/landlord/dashboard')
  if (session.user.roleRecordId) redirect('/dashboard') // already complete

  const universities = await getUniversitiesForSignup()

  return <CompleteProfileClient universities={universities} email={session.user.email ?? ''} firstName={session.user.firstName} />
}