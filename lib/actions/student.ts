// lib/actions/student.ts
'use server'

import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db'
import { savedRooms, rooms } from '../db/schema'
import { auth } from '../auth'

export async function toggleSaveRoom(
  roomId: string
): Promise<{ success: true; saved: boolean } | { error: string }> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') {
    return { error: 'You must be logged in as a student to save rooms.' }
  }
  const studentId = session.user.roleRecordId
  if (!studentId) return { error: 'Student profile not found.' }

  const [room] = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.id, roomId))
  if (!room) return { error: 'Room not found.' }

  try {
    const [existing] = await db.select().from(savedRooms)
      .where(and(eq(savedRooms.studentId, studentId), eq(savedRooms.roomId, roomId)))

    if (existing) {
      await db.delete(savedRooms).where(eq(savedRooms.id, existing.id))
      revalidatePath('/saved')
      revalidatePath(`/rooms/${roomId}`)
      return { success: true, saved: false }
    }

    await db.insert(savedRooms).values({ studentId, roomId })
    revalidatePath('/saved')
    revalidatePath(`/rooms/${roomId}`)
    return { success: true, saved: true }
  } catch (err) {
    console.error('toggleSaveRoom failed', err)
    return { error: 'Could not update saved rooms. Please try again.' }
  }
}