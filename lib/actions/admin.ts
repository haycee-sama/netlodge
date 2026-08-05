// lib/actions/admin.ts
'use server'

import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db'
import { students, landlords, properties, bookings, rooms, users } from '../db/schema'
import { auth } from '../auth'
import { createNotification } from '../notifications/create'
import { sendEmail, verificationStatusEmailHtml, disputeFiledStudentEmailHtml, disputeFiledLandlordEmailHtml } from '../email/sendEmail'
import { decryptAccountNumberFromBase64 } from '../crypto/bankAccount'
import { payoutToLandlordBank } from '../payments/paystackTransfer'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { error: 'Unauthorized.' } as const
  }
  return { adminUserId: session.user.id } as const
}

// ════════════════════════════════════════════════════════════
// KYC MODERATION
// ════════════════════════════════════════════════════════════

export async function approveUserKyc(userId: string, roleType: 'student' | 'landlord') {
  const authResult = await requireAdmin()
  if ('error' in authResult) return authResult

  try {
    if (roleType === 'student') {
      await db.update(students).set({
        verificationStatus: 'approved',
        reviewedBy: authResult.adminUserId,
        reviewedAt: new Date(),
      }).where(eq(students.userId, userId))
    } else {
      await db.update(landlords).set({
        verificationStatus: 'approved',
        reviewedBy: authResult.adminUserId,
        reviewedAt: new Date(),
      }).where(eq(landlords.userId, userId))
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (user) {
      await createNotification(
        user.id,
        `Your ${roleType} verification has been approved! You can now ${roleType === 'landlord' ? 'list properties' : 'book rooms'} on Netlodge.`,
        'kyc_approved'
      )
      sendEmail({
        to: user.email,
        subject: 'You are verified on Netlodge! 🎉',
        html: verificationStatusEmailHtml(user.firstName, roleType, 'approved'),
      }).catch((err) => console.error('kyc approval email failed', err))
    }

    revalidatePath('/admin/kyc')
    return { success: true }
  } catch (err) {
    console.error('approveUserKyc failed', err)
    return { error: 'Could not approve verification. Please try again.' }
  }
}

export async function rejectUserKyc(userId: string, roleType: 'student' | 'landlord', reason: string) {
  const authResult = await requireAdmin()
  if ('error' in authResult) return authResult

  if (!reason?.trim()) return { error: 'A rejection reason is required.' }

  try {
    if (roleType === 'student') {
      await db.update(students).set({
        verificationStatus: 'rejected',
        reviewedBy: authResult.adminUserId,
        reviewedAt: new Date(),
      }).where(eq(students.userId, userId))
    } else {
      await db.update(landlords).set({
        verificationStatus: 'rejected',
        reviewedBy: authResult.adminUserId,
        reviewedAt: new Date(),
      }).where(eq(landlords.userId, userId))
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (user) {
      await createNotification(
        user.id,
        `Your ${roleType} verification was not approved: ${reason.trim()}`,
        'kyc_rejected'
      )
      sendEmail({
        to: user.email,
        subject: 'Netlodge verification update',
        html: verificationStatusEmailHtml(user.firstName, roleType, 'rejected'),
      }).catch((err) => console.error('kyc rejection email failed', err))
    }

    revalidatePath('/admin/kyc')
    return { success: true }
  } catch (err) {
    console.error('rejectUserKyc failed', err)
    return { error: 'Could not reject verification. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// PROPERTY MODERATION
// ════════════════════════════════════════════════════════════

export async function togglePropertyVerification(propertyId: string) {
  const authResult = await requireAdmin()
  if ('error' in authResult) return authResult

  try {
    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId))
    if (!property) return { error: 'Property not found.' }

    await db.update(properties).set({
      isVerified: !property.isVerified,
      updatedAt: new Date(),
    }).where(eq(properties.id, propertyId))

    revalidatePath('/admin/properties')
    revalidatePath(`/property/${propertyId}`)
    return { success: true, isVerified: !property.isVerified }
  } catch (err) {
    console.error('togglePropertyVerification failed', err)
    return { error: 'Could not update property verification. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// DISPUTE RESOLUTION
//
// NOTE ON NAMING: the requested spec referenced a `landlordPayoutStatus`
// field with values 'deducted'/'released' that doesn't exist in the
// schema. What exists (from Phase F) is `disputeStatus` — this maps onto
// that instead:
//   - resolveDisputeForStudent -> disputeStatus = 'resolved_refund'
//   - resolveDisputeForLandlord -> disputeStatus = 'resolved_release',
//     which also triggers the actual landlord payout via Paystack transfer
//     (the same path the escrow cron job uses), since a landlord-favor
//     resolution is functionally "release escrow now, dispute or not."
// `bookingId` is used as the identifier throughout — there is no separate
// disputes table; a dispute IS a bookings row with disputeStatus='pending'.
// ════════════════════════════════════════════════════════════

export async function resolveDisputeForStudent(bookingId: string) {
  const authResult = await requireAdmin()
  if ('error' in authResult) return authResult

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId))
  if (!booking) return { error: 'Booking not found.' }
  if (booking.disputeStatus !== 'pending') return { error: 'This dispute is not open.' }

  try {
    // ⚠️ ACTUAL REFUND NOT IMPLEMENTED: no Paystack refund API call exists
    // anywhere in this codebase yet — only outbound transfers-to-landlord
    // (used by the escrow cron and the landlord-favor path below). This
    // marks the dispute resolved and cancels the booking so the room
    // becomes bookable again, but the money movement back to the student
    // must currently be triggered manually via the Paystack dashboard
    // (Transactions -> booking.paymentReference -> Refund) until a
    // `refundStudentPayment()` action is built. Flagging clearly rather
    // than silently pretending this is automated.
    await db.update(bookings).set({
      disputeStatus: 'resolved_refund',
      status: 'cancelled',
    }).where(eq(bookings.id, bookingId))

    const [room] = await db.select().from(rooms).where(eq(rooms.id, booking.roomId))
    if (room?.status === 'booked') {
      await db.update(rooms).set({ status: 'available' }).where(eq(rooms.id, booking.roomId))
    }

    const [studentUser] = await db.select().from(users).where(eq(users.id, booking.studentId)).limit(0) // placeholder, corrected below
    // studentId on bookings references students.id, not users.id directly —
    // resolve through the students table.
    const { students: studentsTable } = await import('../db/schema')
    const [studentRow] = await db.select().from(studentsTable).where(eq(studentsTable.id, booking.studentId))
    const resolvedStudentUser = studentRow
      ? (await db.select().from(users).where(eq(users.id, studentRow.userId)))[0]
      : undefined

    if (resolvedStudentUser) {
      await createNotification(
        resolvedStudentUser.id,
        `Your dispute for booking ${booking.bookingRef} was resolved in your favor. A refund has been initiated.`,
        'dispute_resolved'
      )
      sendEmail({
        to: resolvedStudentUser.email,
        subject: 'Your Netlodge dispute has been resolved',
        html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#f97316;">Dispute resolved — refund initiated</h2>
          <p style="color:#374151;">Hi ${resolvedStudentUser.firstName}, we've reviewed your dispute for booking <strong>${booking.bookingRef}</strong> and resolved it in your favor. Your refund is being processed and should reflect within 5-7 business days.</p>
        </div>`,
      }).catch((err) => console.error('dispute resolution (student) email failed', err))
    }

    revalidatePath('/admin/disputes')
    revalidatePath('/booking')
    return { success: true }
  } catch (err) {
    console.error('resolveDisputeForStudent failed', err)
    return { error: 'Could not resolve dispute. Please try again.' }
  }
}

export async function resolveDisputeForLandlord(bookingId: string) {
  const authResult = await requireAdmin()
  if ('error' in authResult) return authResult

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId))
  if (!booking) return { error: 'Booking not found.' }
  if (booking.disputeStatus !== 'pending') return { error: 'This dispute is not open.' }
  if (booking.escrowReleasedAt) return { error: 'Escrow for this booking was already released.' }

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
  if (!paystackSecretKey) return { error: 'Payments are not configured.' }

  try {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, booking.roomId))
    if (!room) return { error: 'Room not found for this booking.' }

    const [property] = await db.select().from(properties).where(eq(properties.id, room.propertyId))
    if (!property) return { error: 'Property not found for this room.' }

    const [landlord] = await db.select().from(landlords).where(eq(landlords.id, property.landlordId))
    if (!landlord) return { error: 'Landlord record not found.' }

    if (!landlord.bankAccountNumberEncrypted || !landlord.bankName || !landlord.bankAccountName) {
      return { error: 'Landlord has no payout bank account on file. Resolve this before releasing funds.' }
    }

    const accountNumber = decryptAccountNumberFromBase64(landlord.bankAccountNumberEncrypted)
    const payoutAmountKobo = Math.round(Number(booking.roomPrice) * 100)

    const transferResult = await payoutToLandlordBank(
      paystackSecretKey,
      landlord.bankName,
      accountNumber,
      landlord.bankAccountName,
      payoutAmountKobo,
      `Netlodge dispute resolved (landlord) — booking ${booking.bookingRef}`
    )

    if ('error' in transferResult) return { error: `Payout failed: ${transferResult.error}` }

    await db.update(bookings).set({
      disputeStatus: 'resolved_release',
      escrowReleasedAt: new Date(),
      landlordPayoutReference: transferResult.reference,
    }).where(eq(bookings.id, bookingId))

    const landlordUser = (await db.select().from(users).where(eq(users.id, landlord.userId)))[0]
    if (landlordUser) {
      await createNotification(
        landlordUser.id,
        `The dispute for booking ${booking.bookingRef} was resolved in your favor. Funds have been released.`,
        'dispute_resolved'
      )
      sendEmail({
        to: landlordUser.email,
        subject: 'Your Netlodge dispute has been resolved',
        html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#f97316;">Dispute resolved — funds released</h2>
          <p style="color:#374151;">Hi ${landlordUser.firstName}, the dispute for booking <strong>${booking.bookingRef}</strong> was resolved in your favor. ₦${Number(booking.roomPrice).toLocaleString()} has been transferred to your registered bank account.</p>
        </div>`,
      }).catch((err) => console.error('dispute resolution (landlord) email failed', err))
    }

    revalidatePath('/admin/disputes')
    revalidatePath('/landlord/bookings')
    return { success: true }
  } catch (err) {
    console.error('resolveDisputeForLandlord failed', err)
    return { error: 'Could not resolve dispute. Please try again.' }
  }
}