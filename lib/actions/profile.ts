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
  if (session.user.roleRecordId) return { error: 'Profile already complete.' }

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
  } catch (err) {
    console.error('completeStudentProfile failed', err)
    return { error: 'Could not save your profile. Please try again.' }
  }
}