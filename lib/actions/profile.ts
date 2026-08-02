// lib/actions/profile.ts
'use server'

import { eq } from 'drizzle-orm'
import { auth } from '../auth'
import { db } from '../db'
import { students, universities } from '../db/schema'

export async function completeStudentProfile(input: {
  universityName: string
  course: string
  year: string
  phone: string
}): Promise<{ success: true } | { error: string }> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') return { error: 'Unauthorized.' }

  // Idempotency guard — check the DATABASE directly rather than trusting
  // session.user.roleRecordId. The JWT can be stale for a request or two
  // after this action runs (cookie propagation / client router cache),
  // so a second submit must be treated as "already done", not an error.
  const [existing] = await db.select({ id: students.id }).from(students)
    .where(eq(students.userId, session.user.id)).limit(1)
  if (existing) return { success: true }

  const { universityName, course, year, phone } = input
  if (!universityName) return { error: 'Please select your university.' }
  if (!course?.trim()) return { error: 'Course is required.' }
  if (!year) return { error: 'Please select your year.' }
  if (!phone?.trim() || !/^0\d{10}$/.test(phone)) return { error: 'Enter a valid 11-digit phone number.' }

  const [university] = await db.select().from(universities).where(eq(universities.name, universityName)).limit(1)
  if (!university) return { error: 'Selected university was not found.' }

  try {
    await db.insert(students).values({
      userId: session.user.id,
      universityId: university.id,
      course: course.trim(),
      yearLevel: year,
    })
    return { success: true }
  } catch (err: any) {
    // Belt-and-suspenders: if a race slipped past the check above
    // (near-simultaneous double submit), treat the unique-constraint
    // violation as success rather than surfacing a raw DB error.
    if (err?.cause?.code === '23505' || err?.code === '23505') {
      return { success: true }
    }
    console.error('completeStudentProfile failed', err)
    return { error: 'Could not save your profile. Please try again.' }
  }
}