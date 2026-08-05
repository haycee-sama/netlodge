// lib/actions/booking.ts
'use server'

import { eq, and, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db'
import { bookings, rooms, roomLeaseOptions, properties, landlords, students, users } from '../db/schema'
import { auth } from '../auth'
import { SERVICE_FEE_RATE } from '../constants'
import { createNotification } from '../notifications/create'
import { sendEmail, bookingConfirmedEmailHtml, newBookingEmailHtml } from '../email/sendEmail'


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
//
// DEDUPE GUARD: before inserting, checks for an existing draft or
// pending_payment booking by this student for this exact room. If one
// exists, its id is returned instead of creating a duplicate.
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

  const [existingBooking] = await db.select().from(bookings).where(
    and(
      eq(bookings.studentId, studentId),
      eq(bookings.roomId, roomId),
      inArray(bookings.status, ['draft', 'pending_payment'])
    )
  )
  if (existingBooking) {
    return { success: true, bookingId: existingBooking.id }
  }

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
//
// CALLBACK URL: callback_url is set to our own /booking/success route
// with bookingId already attached as a query param. Paystack appends
// its own reference and trxref query params to this exact URL on
// redirect after payment, so the success page always receives both
// our bookingId and Paystack's reference in one browser navigation.
// NEXT_PUBLIC_APP_URL must be set to the real production origin in
// production (e.g. https://netlodge.ng); it falls back to localhost
// for local development.
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
  const callbackUrl = `${appUrl}/booking/success?bookingId=${bookingId}`

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
        callback_url: callbackUrl,
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
// paid/confirmed. Independently re-verifies with Paystack's own
// /transaction/verify endpoint, never trusts a caller-supplied claim.
// Idempotent, safe to call twice for the same event.
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

    await db.transaction(async (tx) => {
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
      await db.update(bookings).set({
        status: 'cancelled',
        paymentStatus: 'paid',
        paymentReference: reference,
        paidAt: new Date(),
      }).where(eq(bookings.id, bookingId))

      return { error: 'This room was booked by someone else moments before your payment completed. Your payment was successful and will be refunded — our support team has been notified. Please contact support with your reference for a fast-tracked refund.' }
    }

    try {
      const [room] = await db.select().from(rooms).where(eq(rooms.id, booking.roomId))
      if (room) {
        const [property] = await db.select().from(properties).where(eq(properties.id, room.propertyId))
        const [studentRow] = await db.select().from(students).where(eq(students.id, booking.studentId))
        const studentUser = studentRow
          ? (await db.select().from(users).where(eq(users.id, studentRow.userId)))[0]
          : undefined

        let landlordUser: typeof users.$inferSelect | undefined
        if (property) {
          const [landlordRow] = await db.select().from(landlords).where(eq(landlords.id, property.landlordId))
          if (landlordRow) {
            landlordUser = (await db.select().from(users).where(eq(users.id, landlordRow.userId)))[0]
          }
        }

        const roomLabel = `Room ${room.roomNumber}${property ? ` at ${property.name}` : ''}`

        if (studentUser) {
          await createNotification(studentUser.id, `Your booking for ${roomLabel} is confirmed!`, 'booking_confirmed')
          sendEmail({
            to: studentUser.email,
            subject: 'Your Netlodge booking is confirmed!',
            html: bookingConfirmedEmailHtml(studentUser.firstName, roomLabel, booking.bookingRef),
          }).catch((err) => console.error('booking confirmation email failed', err))
        }

        if (landlordUser) {
          await createNotification(landlordUser.id, `You have a new confirmed booking for ${roomLabel}.`, 'new_booking')
          sendEmail({
            to: landlordUser.email,
            subject: 'New booking on Netlodge',
            html: newBookingEmailHtml(landlordUser.firstName, roomLabel, booking.bookingRef),
          }).catch((err) => console.error('new booking email failed', err))
        }
      }
    } catch (notifyErr) {
      console.error('finalizeConfirmedBooking: post-confirm notification failed', notifyErr)
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
// checkBookingStatus — lightweight, session-scoped status read used
// by the client-side polling loop on /booking/success. Returns only
// the status field, never the full booking, to keep each poll cheap.
// ════════════════════════════════════════════════════════════
export async function checkBookingStatus(bookingId: string): Promise<{ status: string } | { error: string }> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') return { error: 'Unauthorized.' }
  const studentId = session.user.roleRecordId
  if (!studentId) return { error: 'Student profile not found.' }

  const [booking] = await db.select({
    status: bookings.status,
    studentId: bookings.studentId,
  }).from(bookings).where(eq(bookings.id, bookingId))

  if (!booking) return { error: 'Booking not found.' }
  if (booking.studentId !== studentId) return { error: 'You do not have access to this booking.' }

  return { status: booking.status }
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