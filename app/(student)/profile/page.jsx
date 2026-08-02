// app/(student)/profile/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../lib/auth'
import { getStudentProfileById } from '../../../lib/db/queries'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') redirect('/login')
  const studentId = session.user.roleRecordId
  if (!studentId) redirect('/complete-profile')

  const profile = await getStudentProfileById(studentId)
  if (!profile) redirect('/complete-profile')

  return <ProfileClient profile={profile} />
}