// lib/actions/booking.ts
'use server'

import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db'
import { bookings, rooms, roomLeaseOptions } from '../db/schema'
import { auth } from '../auth'

const SERVICE_FEE_RATE = 0.07
const VALID_PAYMENT_METHODS = ['card', 'bank_transfer', 'ussd', 'opay', 'moniepoint', 'qr', 'mobile_money']

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
// createBooking — replaces the /booking/confirm → /booking/pay URL-param handoff
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
// confirmBookingPayment — moves draft → pending_payment, records method
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

  try {
    await db.update(bookings).set({
      status: 'pending_payment',
      paymentMethod: paymentMethod as any,
    }).where(eq(bookings.id, bookingId))

    // Placeholder — real implementation calls Paystack's
    // /transaction/initialize endpoint and returns its authorization_url.
    const authorizationUrl = `https://checkout.paystack.com/placeholder/${bookingId}`

    return { success: true, authorizationUrl }
  } catch (err) {
    console.error('confirmBookingPayment failed', err)
    return { error: 'Could not initiate payment. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// verifyBookingPayment — pending_payment → confirmed, room → booked
// ════════════════════════════════════════════════════════════
export async function verifyBookingPayment(bookingId: string, paymentReference: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') return { error: 'Unauthorized.' }
  const studentId = session.user.roleRecordId

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId))
  if (!booking) return { error: 'Booking not found.' }
  if (booking.studentId !== studentId) return { error: 'You do not have access to this booking.' }
  if (booking.status !== 'pending_payment') return { error: 'This booking is not awaiting payment.' }

  try {
    // NOTE: neon-http does not provide the same hard rollback guarantee
    // as a pooled connection. If a partial failure here (booking updates
    // but room update fails) becomes a real risk, switch this action to
    // drizzle-orm/neon-serverless for a true pooled transaction.
    await db.transaction(async (tx) => {
      await tx.update(bookings).set({
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentReference,
        paidAt: new Date(),
      }).where(eq(bookings.id, bookingId))

      await tx.update(rooms).set({ status: 'booked' }).where(eq(rooms.id, booking.roomId))
    })

    revalidatePath('/booking')
    return { success: true, bookingRef: booking.bookingRef }
  } catch (err) {
    console.error('verifyBookingPayment failed', err)
    return { error: 'Could not verify payment. Please contact support.' }
  }
}

// ════════════════════════════════════════════════════════════
// cancelBooking
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