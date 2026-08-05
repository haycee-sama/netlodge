// lib/actions/student.ts
'use server'

import bcrypt from 'bcryptjs'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db'
import { savedRooms, rooms, students, users } from '../db/schema'
import { auth } from '../auth'
import { requireStudentId } from '../auth-guards'
import { encryptAccountNumberToBase64 } from '../crypto/bankAccount'

type StudentAuthResult =
  | { error: string }
  | { studentId: string; userId: string }

async function requireStudent(): Promise<StudentAuthResult> {
  const result = await requireStudentId()
  if ('error' in result) return { error: result.error! }
  return { studentId: result.studentId, userId: result.userId }
}

// ════════════════════════════════════════════════════════════
// toggleSaveRoom — unchanged
// ════════════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════════════
// updateStudentProfile — course, year level, phone
// ════════════════════════════════════════════════════════════
export async function updateStudentProfile(data: {
  course: string
  yearLevel: string
  phone: string
}): Promise<{ success: true } | { error: string }> {
  const authResult = await requireStudent()
  if ('error' in authResult) return { error: authResult.error }

  if (!data.course?.trim()) return { error: 'Course is required.' }
  if (!data.yearLevel) return { error: 'Please select your year.' }
  if (!data.phone?.trim() || !/^0\d{10}$/.test(data.phone)) return { error: 'Enter a valid 11-digit phone number.' }

  try {
    await db.update(students).set({
      course: data.course.trim(),
      yearLevel: data.yearLevel,
      updatedAt: new Date(),
    }).where(eq(students.id, authResult.studentId))

    await db.update(users).set({ phone: data.phone.trim() }).where(eq(users.id, authResult.userId))

    revalidatePath('/profile')
    return { success: true }
  } catch (err) {
    console.error('updateStudentProfile failed', err)
    return { error: 'Could not update your profile. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// updateStudentPassword — verifies current password with bcrypt.compare
// before writing the new hash. OAuth-only accounts (no passwordHash)
// are rejected with a clear message rather than silently failing.
// ════════════════════════════════════════════════════════════
export async function updateStudentPassword(data: {
  currentPassword: string
  newPassword: string
}): Promise<{ success: true } | { error: string }> {
  const authResult = await requireStudent()
  if ('error' in authResult) return authResult

  if (!data.currentPassword) return { error: 'Enter your current password.' }
  if (!data.newPassword || data.newPassword.length < 8) return { error: 'New password must be at least 8 characters.' }

  const [user] = await db.select().from(users).where(eq(users.id, authResult.userId)).limit(1)
  if (!user) return { error: 'Account not found.' }
  if (!user.passwordHash) {
    return { error: 'This account signed up with Google and has no password to change.' }
  }

  const matches = await bcrypt.compare(data.currentPassword, user.passwordHash)
  if (!matches) return { error: 'Current password is incorrect.' }

  try {
    const newHash = await bcrypt.hash(data.newPassword, 10)
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, authResult.userId))
    return { success: true }
  } catch (err) {
    console.error('updateStudentPassword failed', err)
    return { error: 'Could not update your password. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// updateNotificationPreferences
// ════════════════════════════════════════════════════════════
export async function updateNotificationPreferences(prefs: {
  bookingUpdates: boolean
  paymentReceipts: boolean
  leaseReminders: boolean
  newListings: boolean
  promotions: boolean
  smsAlerts: boolean
}): Promise<{ success: true } | { error: string }> {
  const authResult = await requireStudent()
  if ('error' in authResult) return authResult

  try {
    await db.update(users).set({ notificationPreferences: prefs }).where(eq(users.id, authResult.userId))
    revalidatePath('/profile')
    return { success: true }
  } catch (err) {
    console.error('updateNotificationPreferences failed', err)
    return { error: 'Could not save your preferences. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// submitStudentVerification — mirrors submitLandlordKyc. NIN/BVN is
// encrypted at rest (never stored in plaintext); documents recorded
// with type/url/name. verificationStatus is left at 'pending' for
// manual/automated review — never set to 'approved' here.
// ════════════════════════════════════════════════════════════
export async function submitStudentVerification(data: {
  docType: string
  document: { url: string; name: string } | null
  ninOrBvn: string
  universityEmail?: string
}): Promise<{ success: true } | { error: string }> {
  const authResult = await requireStudent()
  if ('error' in authResult) return authResult

  if (!data.docType) return { error: 'Please select a document type.' }
  if (!data.document) return { error: 'Please upload your document.' }
  if (!data.ninOrBvn?.trim() || data.ninOrBvn.trim().length < 11) {
    return { error: 'Enter a valid 11-digit NIN or BVN.' }
  }

  const kycDocuments = [{ type: data.docType, url: data.document.url, name: data.document.name }]

  try {
    await db.update(students).set({
      kycDocuments,
      ninBvnEncrypted: encryptAccountNumberToBase64(data.ninOrBvn.trim()),
      universityEmail: data.universityEmail?.trim() || null,
      updatedAt: new Date(),
    }).where(eq(students.id, authResult.studentId))

    revalidatePath('/verify/status')
    return { success: true }
  } catch (err) {
    console.error('submitStudentVerification failed', err)
    return { error: 'Could not submit your documents. Please try again.' }
  }
}