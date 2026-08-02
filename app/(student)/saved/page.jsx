// app/(student)/saved/page.jsx
import { redirect } from 'next/navigation'
import { auth } from '../../../lib/auth'
import { getSavedRoomsByStudent } from '../../../lib/db/queries'
import SavedRoomsClient from './SavedRoomsClient'

export default async function SavedRoomsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') redirect('/login')
  const studentId = session.user.roleRecordId
  if (!studentId) redirect('/login')

  const savedRooms = await getSavedRoomsByStudent(studentId)

  return <SavedRoomsClient savedRooms={savedRooms} />
}