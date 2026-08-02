// lib/actions/booking.ts
'use server'

import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db'
import { bookings, rooms, roomLeaseOptions } from '../db/schema'
import { auth } from '../auth'
import { SERVICE_FEE_RATE } from '../constants'


const VALID_PAYMENT_METHODS = ['card', 'bank_transfer', 'ussd', 'opay', 'moniepoint', 'qr', 'mobile_money']
const PAYSTACK_BASE_URL = 'https://api.paystack.co'

function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function leaseMonths(leaseType: string) {
  if (leaseType === 'full_year') return 12
  if (leaseType === 'per_semester') return 5
  if (leaseType === 'half_year') return 6
  return 12
}

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10)
}

// ════════════════════════════════════════════════════════════
// createBooking — creates a draft booking row
// ════════════════════════════════════════════════════════════
export async function createBooking(
  roomId: string,
  leaseType: 'full_year' | 'per_semester' | 'half_year',
  moveInDate: string
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') {
    return { error: 'You must be logged in as a student to book a room.' }
  }
  const studentId = session.user.roleRecordId
  if (!studentId) return { error: 'Student profile not found.' }

  const [leaseOption] = await db.select().from(roomLeaseOptions).where(
    and(
      eq(roomLeaseOptions.roomId, roomId),
      eq(roomLeaseOptions.leaseType, leaseType),
      eq(roomLeaseOptions.isEnabled, true)
    )
  )
  if (!leaseOption) return { error: 'This lease option is not available for this room.' }

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId))
  if (!room) return { error: 'Room not found.' }
  if (room.status !== 'available') return { error: 'This room is no longer available.' }

  const moveIn = new Date(moveInDate)
  if (isNaN(moveIn.getTime())) return { error: 'Invalid move-in date.' }

  const roomPrice = Number(leaseOption.price)
  const serviceFee = Math.round(roomPrice * SERVICE_FEE_RATE)
  const totalAmount = roomPrice + serviceFee
  const leaseEnd = addMonths(moveIn, leaseMonths(leaseType))

  try {
    const [booking] = await db.insert(bookings).values({
      studentId,
      roomId,
      leaseType,
      roomPrice: roomPrice.toString(),
      serviceFee: serviceFee.toString(),
      totalAmount: totalAmount.toString(),
      moveInDate: toDateString(moveIn),
      leaseEndDate: toDateString(leaseEnd),
      status: 'draft',
    }).returning()

    return { success: true, bookingId: booking.id }
  } catch (err) {
    console.error('createBooking failed', err)
    return { error: 'Could not create booking. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// confirmBookingPayment — draft → pending_payment, initializes a real
// Paystack transaction, returns the hosted checkout URL to redirect to.
// ════════════════════════════════════════════════════════════
export async function confirmBookingPayment(bookingId: string, paymentMethod: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') return { error: 'Unauthorized.' }
  const studentId = session.user.roleRecordId

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId))
  if (!booking) return { error: 'Booking not found.' }
  if (booking.studentId !== studentId) return { error: 'You do not have access to this booking.' }
  if (booking.status !== 'draft') return { error: 'This booking cannot be modified.' }
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) return { error: 'Invalid payment method.' }

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    console.error('PAYSTACK_SECRET_KEY not set')
    return { error: 'Payments are not configured. Please contact support.' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const amountKobo = Math.round(Number(booking.totalAmount) * 100)

  try {
    const paystackRes = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: session.user.email,
        amount: amountKobo,
        currency: 'NGN',
        callback_url: `${appUrl}/booking/success?bookingId=${bookingId}`,
        metadata: { bookingId, studentId },
      }),
    })

    const paystackData = await paystackRes.json()

    if (!paystackRes.ok || !paystackData.status) {
      console.error('Paystack initialize failed', paystackData)
      return { error: 'Could not initiate payment. Please try again.' }
    }

    try {
      await db.update(bookings).set({
        status: 'pending_payment',
        paymentMethod: paymentMethod as any,
        paymentReference: paystackData.data.reference,
      }).where(eq(bookings.id, bookingId))
    } catch (err: any) {
      // Hits the partial unique index (uniq_active_booking_per_room) if
      // another booking for this room is already pending_payment/confirmed.
      const pgCode = err?.code ?? err?.cause?.code
      if (pgCode === '23505') {
        return { error: 'This room was just reserved by another student. Please choose a different room.' }
      }
      throw err
    }

    return { success: true, authorizationUrl: paystackData.data.authorization_url }
  } catch (err) {
    console.error('confirmBookingPayment failed', err)
    return { error: 'Could not initiate payment. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// finalizeConfirmedBooking — the ONLY path that ever marks a booking
// paid/confirmed. Takes a reference, not a bookingId — always
// independently re-verifies with Paystack's /transaction/verify
// endpoint and pulls bookingId out of PAYSTACK's own response, never
// trusting a caller-supplied claim. Called by both the webhook and the
// /booking/success page fallback; idempotent, safe to call twice for
// the same event.
//
// RACE-CONDITION FIX: the room's status is flipped to 'booked' with a
// WHERE status = 'available' guard. If a concurrent booking already
// claimed the room (e.g. two students paid within seconds of each
// other), this update returns zero rows, we detect that as a genuine
// conflict, and we do NOT confirm the second booking — instead we
// cancel it and flag it for a manual refund review.
// ════════════════════════════════════════════════════════════
export async function finalizeConfirmedBooking(reference: string): Promise<{ success: true; bookingRef: string; alreadyConfirmed?: boolean } | { error: string }> {
  if (!reference) return { error: 'Missing payment reference.' }

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) return { error: 'Payments are not configured.' }

  let verifyData: any
  try {
    const verifyRes = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    verifyData = await verifyRes.json()
  } catch (err) {
    console.error('Paystack verify request failed', err)
    return { error: 'Could not verify payment with Paystack.' }
  }


  if (!verifyData?.status || verifyData.data?.status !== 'success') {
    return { error: 'Payment was not successful.' }
  }

  const bookingId = verifyData.data?.metadata?.bookingId
  if (!bookingId) return { error: 'Payment reference is missing booking information.' }

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId))
  if (!booking) return { error: 'Booking not found for this payment.' }

  if (booking.status === 'confirmed' && booking.paymentStatus === 'paid') {
    return { success: true, bookingRef: booking.bookingRef, alreadyConfirmed: true }
  }

  if (booking.paymentReference !== reference) {
    console.error('Paystack reference mismatch', { bookingId, stored: booking.paymentReference, got: reference })
    return { error: 'Payment reference does not match this booking.' }
  }

  const expectedKobo = Math.round(Number(booking.totalAmount) * 100)
  if (verifyData.data.amount !== expectedKobo) {
    console.error('Paystack amount mismatch', { expected: expectedKobo, got: verifyData.data.amount, bookingId })
    return { error: 'Payment amount does not match this booking.' }
  }

  try {
    let conflict = false

    // NOTE: neon-http does not provide the same hard rollback guarantee
    // as a pooled connection. See earlier note — drizzle-orm/neon-serverless
    // is the upgrade path if this two-table write ever needs a true
    // atomic rollback guarantee.
    await db.transaction(async (tx) => {
      // Conditional update — only succeeds if the room is still 'available'.
      // If another confirmed booking already claimed this room, this
      // returns zero rows and we treat it as a conflict rather than
      // silently confirming a double-booking.
      const claimedRoom = await tx.update(rooms)
        .set({ status: 'booked' })
        .where(and(eq(rooms.id, booking.roomId), eq(rooms.status, 'available')))
        .returning({ id: rooms.id })

      if (claimedRoom.length === 0) {
        conflict = true
        return
      }

      await tx.update(bookings).set({
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentReference: reference,
        paidAt: new Date(),
      }).where(eq(bookings.id, bookingId))
    })

    if (conflict) {
      console.error('CONFLICT: room already booked, payment succeeded — flagging for manual refund', {
        bookingId, roomId: booking.roomId, reference,
      })
      // Mark this booking clearly as paid-but-cancelled so it surfaces
      // in admin/ops queries as needing a manual refund, instead of
      // silently double-confirming the room.
      await db.update(bookings).set({
        status: 'cancelled',
        paymentStatus: 'paid',
        paymentReference: reference,
        paidAt: new Date(),
      }).where(eq(bookings.id, bookingId))

      return { error: 'This room was booked by someone else moments before your payment completed. Your payment was successful and will be refunded — our support team has been notified. Please contact support with your reference for a fast-tracked refund.' }
    }

    revalidatePath('/booking')
    revalidatePath('/dashboard')
    return { success: true, bookingRef: booking.bookingRef }
  } catch (err) {
    console.error('finalizeConfirmedBooking write failed', err)
    return { error: 'Could not finalize booking. Please contact support.' }
  }
}

// ════════════════════════════════════════════════════════════
// cancelBooking — unchanged
// ════════════════════════════════════════════════════════════
export async function cancelBooking(bookingId: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') return { error: 'Unauthorized.' }
  const studentId = session.user.roleRecordId

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId))
  if (!booking) return { error: 'Booking not found.' }
  if (booking.studentId !== studentId) return { error: 'You do not have access to this booking.' }
  if (!['draft', 'pending_payment'].includes(booking.status)) {
    return { error: 'This booking can no longer be cancelled.' }
  }

  try {
    await db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: 'cancelled' }).where(eq(bookings.id, bookingId))

      const [room] = await tx.select().from(rooms).where(eq(rooms.id, booking.roomId))
      if (room?.status === 'booked') {
        await tx.update(rooms).set({ status: 'available' }).where(eq(rooms.id, booking.roomId))
      }
    })

    revalidatePath('/booking')
    return { success: true }
  } catch (err) {
    console.error('cancelBooking failed', err)
    return { error: 'Could not cancel booking. Please try again.' }
  }
}