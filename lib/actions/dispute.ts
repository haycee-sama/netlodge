// lib/actions/dispute.ts
'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db'
import { bookings, rooms, properties, landlords, students, users } from '../db/schema'
import { auth } from '../auth'
import { createNotification } from '../notifications/create'
import { sendEmail, disputeFiledLandlordEmailHtml, disputeFiledStudentEmailHtml } from '../email/sendEmail'

const ESCROW_WINDOW_HOURS = 48
const MIN_REASON_LENGTH = 10
const MAX_EVIDENCE_FILES = 5

type EvidenceFile = { url: string; name: string }

function sanitizeEvidence(evidenceUrls: unknown): EvidenceFile[] {
  if (!Array.isArray(evidenceUrls)) return []
  return evidenceUrls
    .filter((item): item is EvidenceFile =>
      !!item && typeof item === 'object' && typeof (item as any).url === 'string'
    )
    .slice(0, MAX_EVIDENCE_FILES)
    .map((item) => ({ url: item.url, name: typeof item.name === 'string' ? item.name : 'evidence' }))
}

export async function fileDispute(
  bookingId: string,
  reason: string,
  evidenceUrls: EvidenceFile[] = []
): Promise<{ success: true } | { error: string }> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') {
    return { error: 'You must be logged in as a student to file a dispute.' }
  }
  const studentId = session.user.roleRecordId
  if (!studentId) return { error: 'Student profile not found.' }

  const trimmedReason = reason?.trim() ?? ''
  if (trimmedReason.length < MIN_REASON_LENGTH) {
    return { error: `Please describe the issue in at least ${MIN_REASON_LENGTH} characters.` }
  }

  const evidence = sanitizeEvidence(evidenceUrls)

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId))
  if (!booking) return { error: 'Booking not found.' }
  if (booking.studentId !== studentId) return { error: 'You do not have access to this booking.' }

  if (booking.status !== 'confirmed' || booking.paymentStatus !== 'paid') {
    return { error: 'Disputes can only be filed on a confirmed, paid booking.' }
  }

  if (booking.disputeStatus !== 'none') {
    return { error: 'A dispute has already been filed for this booking.' }
  }

  if (booking.escrowReleasedAt) {
    return { error: 'Funds for this booking have already been released to the landlord. Contact support directly.' }
  }

  if (!booking.paidAt) {
    return { error: 'This booking has no recorded payment time. Contact support.' }
  }

  const hoursSincePaid = (Date.now() - new Date(booking.paidAt).getTime()) / (1000 * 60 * 60)
  if (hoursSincePaid >= ESCROW_WINDOW_HOURS) {
    return { error: 'The 48-hour escrow window has closed. Disputes can no longer be filed for this booking — please contact support.' }
  }

  try {
    await db.update(bookings).set({
      disputeStatus: 'pending',
      disputeReason: trimmedReason,
      disputeEvidence: evidence,
      disputedAt: new Date(),
    }).where(eq(bookings.id, bookingId))

    try {
      const [room] = await db.select().from(rooms).where(eq(rooms.id, booking.roomId))
      if (room) {
        const [property] = await db.select().from(properties).where(eq(properties.id, room.propertyId))
        const roomLabel = `Room ${room.roomNumber}${property ? ` at ${property.name}` : ''}`

        if (property) {
          const [landlordRow] = await db.select().from(landlords).where(eq(landlords.id, property.landlordId))
          if (landlordRow) {
            const [landlordUser] = await db.select().from(users).where(eq(users.id, landlordRow.userId))
            if (landlordUser) {
              await createNotification(landlordUser.id, `A dispute was filed for ${roomLabel}. Please review.`, 'dispute_filed')
              sendEmail({
                to: landlordUser.email,
                subject: 'A dispute was filed on your Netlodge listing',
                html: disputeFiledLandlordEmailHtml(landlordUser.firstName, roomLabel, trimmedReason, booking.bookingRef),
              }).catch((err) => console.error('dispute landlord email failed', err))
            }
          }
        }

        const [studentRow] = await db.select().from(students).where(eq(students.id, studentId))
        const studentUser = studentRow
          ? (await db.select().from(users).where(eq(users.id, studentRow.userId)))[0]
          : undefined
        if (studentUser) {
          sendEmail({
            to: studentUser.email,
            subject: 'Your Netlodge dispute has been filed',
            html: disputeFiledStudentEmailHtml(studentUser.firstName, roomLabel, booking.bookingRef),
          }).catch((err) => console.error('dispute student email failed', err))
        }
      }
    } catch (notifyErr) {
      console.error('fileDispute: post-file notification failed', notifyErr)
    }

    revalidatePath('/booking')
    revalidatePath('/landlord/bookings')
    return { success: true }
  } catch (err) {
    console.error('fileDispute failed', err)
    return { error: 'Could not file your dispute. Please try again.' }
  }
}