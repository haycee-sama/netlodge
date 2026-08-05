// lib/actions/admin.ts
'use server'

import { eq, and, inArray, count, sum, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db'
import {
  users, students, landlords, properties, rooms, bookings,
  universities, cities,
} from '../db/schema'
import { requireAdminId } from '../auth-guards'
import { decryptAccountNumberFromBase64 } from '../crypto/bankAccount'
import { createNotification, notifyVerificationStatusChange } from '../notifications/create'
import { sendEmail } from '../email/sendEmail'

const PAYSTACK_BASE_URL = 'https://api.paystack.co'
const STALE_KYC_HOURS = 24

async function requireAdmin() {
  return requireAdminId()
}

// ════════════════════════════════════════════════════════════
// getAdminDashboardMetrics
//
// Every figure here is a single aggregate query (count/sum pushed down
// to Postgres), not a fetch-everything-then-reduce-in-JS pattern. This
// scales flat regardless of how many users/properties/bookings exist,
// unlike an N+1 approach that would run one query per row.
//
// staleKycCount uses account creation time as a proxy for "submitted
// more than 24 hours ago" — the schema does not currently track a
// separate KYC-submission timestamp distinct from account creation.
// ════════════════════════════════════════════════════════════
export async function getAdminDashboardMetrics() {
  const authResult = await requireAdmin()
  if ('error' in authResult) return authResult

  const staleCutoff = new Date(Date.now() - STALE_KYC_HOURS * 60 * 60 * 1000)

  const [
    [{ value: totalUsers }],
    [{ value: totalStudents }],
    [{ value: totalLandlords }],
    [{ value: pendingStudentKyc }],
    [{ value: pendingLandlordKyc }],
    [{ value: staleStudentKyc }],
    [{ value: staleLandlordKyc }],
    [{ value: openDisputesCount }],
    [{ value: revenueTotal }],
    [{ value: unverifiedWithAvailable }],
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(users).where(eq(users.role, 'student')),
    db.select({ value: count() }).from(users).where(eq(users.role, 'landlord')),
    db.select({ value: count() }).from(students).where(eq(students.verificationStatus, 'pending')),
    db.select({ value: count() }).from(landlords).where(eq(landlords.verificationStatus, 'pending')),
    db.select({ value: count() }).from(students).where(
      and(eq(students.verificationStatus, 'pending'), sql`${students.createdAt} < ${staleCutoff}`)
    ),
    db.select({ value: count() }).from(landlords).where(
      and(eq(landlords.verificationStatus, 'pending'), sql`${landlords.createdAt} < ${staleCutoff}`)
    ),
    db.select({ value: count() }).from(bookings).where(eq(bookings.disputeStatus, 'pending')),
    db.select({ value: sum(bookings.serviceFee) }).from(bookings).where(eq(bookings.paymentStatus, 'paid')),
    db.select({ value: sql<number>`count(distinct ${properties.id})` })
      .from(properties)
      .innerJoin(rooms, eq(rooms.propertyId, properties.id))
      .where(and(eq(properties.isVerified, false), eq(rooms.status, 'available'))),
  ])

  return {
    totalUsers,
    totalStudents,
    totalLandlords,
    pendingKycCount: pendingStudentKyc + pendingLandlordKyc,
    staleKycCount: staleStudentKyc + staleLandlordKyc,
    openDisputesCount,
    unverifiedPropertiesWithAvailableRooms: Number(unverifiedWithAvailable),
    // Platform revenue is the service fee only — the room price itself
    // passes through to the landlord and is not Netlodge's revenue.
    totalRevenue: Number(revenueTotal ?? 0),
  }
}

// ════════════════════════════════════════════════════════════
// getPendingKycSubmissions — combined student + landlord queue,
// sorted oldest-first so the stalest submissions surface at the top.
// ════════════════════════════════════════════════════════════
export async function getPendingKycSubmissions() {
  const authResult = await requireAdmin()
  if ('error' in authResult) return { error: authResult.error }

  const pendingStudents = await db.select().from(students).where(eq(students.verificationStatus, 'pending'))
  const pendingLandlords = await db.select().from(landlords).where(eq(landlords.verificationStatus, 'pending'))

  const studentUserIds = pendingStudents.map((s) => s.userId)
  const landlordUserIds = pendingLandlords.map((l) => l.userId)
  const allUserIds = [...studentUserIds, ...landlordUserIds]

  const userRows = allUserIds.length ? await db.select().from(users).where(inArray(users.id, allUserIds)) : []
  const usersMap = new Map(userRows.map((u) => [u.id, u]))

  const universityIds = pendingStudents.map((s) => s.universityId)
  const universityRows = universityIds.length
    ? await db.select().from(universities).where(inArray(universities.id, universityIds))
    : []
  const universitiesMap = new Map(universityRows.map((u) => [u.id, u]))

  const studentSubmissions = pendingStudents.map((s) => {
    const user = usersMap.get(s.userId)
    let maskedNinBvn = ''
    if (s.ninBvnEncrypted) {
      try {
        const full = decryptAccountNumberFromBase64(s.ninBvnEncrypted)
        maskedNinBvn = `•••••• ${full.slice(-4)}`
      } catch {
        maskedNinBvn = '•••••• ????'
      }
    }
    return {
      kind: 'student' as const,
      userId: s.userId,
      name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      university: universitiesMap.get(s.universityId)?.name ?? '',
      course: s.course,
      yearLevel: s.yearLevel,
      maskedNinBvn,
      documents: (s.kycDocuments ?? []) as { type: string; url: string; name: string }[],
      submittedAt: s.createdAt.toISOString(),
    }
  })

  const landlordSubmissions = pendingLandlords.map((l) => {
    const user = usersMap.get(l.userId)
    return {
      kind: 'landlord' as const,
      userId: l.userId,
      name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      businessName: l.businessName ?? '',
      documents: (l.kycDocuments ?? []) as { type: string; url: string; name: string }[],
      submittedAt: l.createdAt.toISOString(),
    }
  })

  return {
    success: true as const,
    submissions: [...studentSubmissions, ...landlordSubmissions].sort(
      (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    ),
  }
}

async function resolveUserRole(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  return user
}

// ════════════════════════════════════════════════════════════
// approveUserKyc / rejectUserKyc — dispatch to the students or
// landlords table based on the user's role, since verificationStatus
// lives on the role-specific record, not on users itself.
// ════════════════════════════════════════════════════════════
export async function approveUserKyc(userId: string) {
  const authResult = await requireAdmin()
  if ('error' in authResult) return authResult

  const user = await resolveUserRole(userId)
  if (!user) return { error: 'User not found.' }
  if (user.role !== 'student' && user.role !== 'landlord') {
    return { error: 'Only student or landlord accounts have KYC to approve.' }
  }

  try {
    if (user.role === 'student') {
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

    await notifyVerificationStatusChange(userId, user.email, user.firstName, user.role, 'approved')

    revalidatePath('/admin/kyc')
    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    console.error('approveUserKyc failed', err)
    return { error: 'Could not approve this submission. Please try again.' }
  }
}

export async function rejectUserKyc(userId: string, reason: string) {
  const authResult = await requireAdmin()
  if ('error' in authResult) return authResult

  const trimmedReason = reason?.trim() ?? ''
  if (trimmedReason.length < 5) {
    return { error: 'Please provide a reason of at least 5 characters.' }
  }

  const user = await resolveUserRole(userId)
  if (!user) return { error: 'User not found.' }
  if (user.role !== 'student' && user.role !== 'landlord') {
    return { error: 'Only student or landlord accounts have KYC to reject.' }
  }

  try {
    if (user.role === 'student') {
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

    await notifyVerificationStatusChange(userId, user.email, user.firstName, user.role, 'rejected', trimmedReason)

    revalidatePath('/admin/kyc')
    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    console.error('rejectUserKyc failed', err)
    return { error: 'Could not reject this submission. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// getAllPropertiesForAdmin — fetch-batched-then-group, matching the
// same pattern used by getPropertiesByLandlord in lib/db/queries.ts,
// just without the landlordId filter. Not N+1: a fixed small number
// of queries regardless of how many properties exist.
// ════════════════════════════════════════════════════════════
export async function getAllPropertiesForAdmin() {
  const authResult = await requireAdmin()
  if ('error' in authResult) return { error: authResult.error }

  const propertyRows = await db.select().from(properties)
  if (propertyRows.length === 0) return { success: true as const, properties: [] }

  const landlordIds = [...new Set(propertyRows.map((p) => p.landlordId))]
  const landlordRows = await db.select().from(landlords).where(inArray(landlords.id, landlordIds))
  const landlordsMap = new Map(landlordRows.map((l) => [l.id, l]))

  const landlordUserIds = landlordRows.map((l) => l.userId)
  const userRows = landlordUserIds.length ? await db.select().from(users).where(inArray(users.id, landlordUserIds)) : []
  const usersByUserId = new Map(userRows.map((u) => [u.id, u]))

  const cityIds = [...new Set(propertyRows.map((p) => p.cityId))]
  const universityIds = [...new Set(propertyRows.map((p) => p.universityId))]
  const cityRows = await db.select().from(cities).where(inArray(cities.id, cityIds))
  const universityRows = await db.select().from(universities).where(inArray(universities.id, universityIds))
  const citiesMap = new Map(cityRows.map((c) => [c.id, c]))
  const universitiesMap = new Map(universityRows.map((u) => [u.id, u]))

  const propertyIds = propertyRows.map((p) => p.id)
  const allRooms = await db.select().from(rooms).where(inArray(rooms.propertyId, propertyIds))
  const roomsByProperty = new Map<string, typeof rooms.$inferSelect[]>()
  for (const r of allRooms) {
    const list = roomsByProperty.get(r.propertyId) ?? []
    list.push(r)
    roomsByProperty.set(r.propertyId, list)
  }

  const result = propertyRows.map((p) => {
    const landlord = landlordsMap.get(p.landlordId)
    const landlordUser = landlord ? usersByUserId.get(landlord.userId) : undefined
    const roomRows = roomsByProperty.get(p.id) ?? []

    return {
      id: p.id,
      name: p.name,
      address: p.address,
      city: citiesMap.get(p.cityId)?.name ?? '',
      university: universitiesMap.get(p.universityId)?.name ?? '',
      landlordName: landlordUser ? `${landlordUser.firstName} ${landlordUser.lastName}` : (landlord?.businessName ?? 'Unknown'),
      landlordVerified: landlord?.verificationStatus === 'approved',
      isVerified: p.isVerified,
      totalRooms: roomRows.length,
      availableRooms: roomRows.filter((r) => r.status === 'available').length,
      createdAt: p.createdAt.toISOString(),
    }
  })

  return { success: true as const, properties: result }
}

// ════════════════════════════════════════════════════════════
// togglePropertyVerification
// ════════════════════════════════════════════════════════════
export async function togglePropertyVerification(propertyId: string) {
  const authResult = await requireAdmin()
  if ('error' in authResult) return authResult

  const [property] = await db.select().from(properties).where(eq(properties.id, propertyId))
  if (!property) return { error: 'Property not found.' }

  try {
    await db.update(properties).set({ isVerified: !property.isVerified }).where(eq(properties.id, propertyId))
    revalidatePath('/admin/properties')
    revalidatePath('/admin')
    return { success: true, isVerified: !property.isVerified }
  } catch (err) {
    console.error('togglePropertyVerification failed', err)
    return { error: 'Could not update property verification. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// getOpenDisputesForAdmin — every booking with disputeStatus 'pending',
// enriched with room/property/student info, the student's submitted
// evidence photos, and the room's original listing photos so an admin
// can compare "what was promised" against "what is being disputed" on
// one screen.
// ════════════════════════════════════════════════════════════
export async function getOpenDisputesForAdmin() {
  const authResult = await requireAdmin()
  if ('error' in authResult) return { error: authResult.error }

  const disputedBookings = await db.select().from(bookings).where(eq(bookings.disputeStatus, 'pending'))
  if (disputedBookings.length === 0) return { success: true as const, disputes: [] }

  const roomIds = [...new Set(disputedBookings.map((b) => b.roomId))]
  const roomRows = await db.select().from(rooms).where(inArray(rooms.id, roomIds))
  const roomsMap = new Map(roomRows.map((r) => [r.id, r]))

  const propertyIds = [...new Set(roomRows.map((r) => r.propertyId))]
  const propertyRows = propertyIds.length
    ? await db.select().from(properties).where(inArray(properties.id, propertyIds))
    : []
  const propertiesMap = new Map(propertyRows.map((p) => [p.id, p]))

  const studentIds = [...new Set(disputedBookings.map((b) => b.studentId))]
  const studentRows = await db.select().from(students).where(inArray(students.id, studentIds))
  const studentsMap = new Map(studentRows.map((s) => [s.id, s]))

  const studentUserIds = studentRows.map((s) => s.userId)
  const userRows = studentUserIds.length ? await db.select().from(users).where(inArray(users.id, studentUserIds)) : []
  const usersByUserId = new Map(userRows.map((u) => [u.id, u]))

  const result = disputedBookings.map((b) => {
    const room = roomsMap.get(b.roomId)
    const property = room ? propertiesMap.get(room.propertyId) : undefined
    const student = studentsMap.get(b.studentId)
    const studentUser = student ? usersByUserId.get(student.userId) : undefined

    return {
      bookingId: b.id,
      bookingRef: b.bookingRef,
      studentName: studentUser ? `${studentUser.firstName} ${studentUser.lastName}` : 'Unknown Student',
      studentEmail: studentUser?.email ?? '',
      roomLabel: room ? `Room ${room.roomNumber}` : '',
      propertyName: property?.name ?? '',
      disputeReason: b.disputeReason ?? '',
      disputeEvidence: (b.disputeEvidence ?? []) as { url: string; name: string }[],
      disputedAt: b.disputedAt ? b.disputedAt.toISOString() : null,
      listingImages: (room?.images ?? []) as { url: string; alt: string }[],
      roomPrice: Number(b.roomPrice),
      totalAmount: Number(b.totalAmount),
      paidAt: b.paidAt ? b.paidAt.toISOString() : null,
    }
  })

  return { success: true as const, disputes: result }
}

// ── Paystack helpers, local to this file. Mirror the equivalent helpers
// in app/api/cron/escrow-release/route.ts, duplicated here rather than
// imported since that route does not export them and this action needs
// to trigger the same payout immediately rather than waiting for the
// next cron run. ──

async function resolveBankCode(bankName: string, secretKey: string): Promise<string | null> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/bank?currency=NGN`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  const data = await res.json()
  if (!data?.status) return null
  const match = (data.data as any[]).find(
    (b) => b.name.toLowerCase().trim() === bankName.toLowerCase().trim()
  )
  return match?.code ?? null
}

async function createTransferRecipient(
  secretKey: string,
  accountNumber: string,
  bankCode: string,
  accountName: string
): Promise<string | null> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transferrecipient`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'nuban',
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN',
    }),
  })
  const data = await res.json()
  if (!data?.status) {
    console.error('createTransferRecipient failed', data)
    return null
  }
  return data.data.recipient_code
}

async function initiateTransfer(
  secretKey: string,
  recipientCode: string,
  amountKobo: number,
  reason: string
): Promise<{ reference: string } | { error: string }> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'balance',
      amount: amountKobo,
      recipient: recipientCode,
      reason,
    }),
  })
  const data = await res.json()
  if (!data?.status) {
    console.error('initiateTransfer failed', data)
    return { error: data?.message ?? 'Transfer failed' }
  }
  return { reference: data.data.reference ?? data.data.transfer_code }
}

// ════════════════════════════════════════════════════════════
// resolveDispute
//
// 'refund' — cancels the booking, frees the room back to available,
// and marks the dispute resolved_refund. The actual Paystack refund is
// handled manually by the finance team off-platform; this mirrors the
// existing manual-refund pattern already used elsewhere in the codebase
// for the room-conflict edge case in finalizeConfirmedBooking.
//
// 'release' — immediately triggers the same Paystack transfer logic
// the escrow-release cron uses, for this single booking, rather than
// waiting for the cron to pick it up (the cron's eligibility query
// only matches disputeStatus = 'none', so a resolved_release booking
// would otherwise never be paid out automatically).
// ════════════════════════════════════════════════════════════
export async function resolveDispute(bookingId: string, resolutionType: 'refund' | 'release') {
  const authResult = await requireAdmin()
  if ('error' in authResult) return authResult

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId))
  if (!booking) return { error: 'Booking not found.' }
  if (booking.disputeStatus !== 'pending') return { error: 'This dispute has already been resolved or does not exist.' }

  const [room] = await db.select().from(rooms).where(eq(rooms.id, booking.roomId))
  const property = room ? (await db.select().from(properties).where(eq(properties.id, room.propertyId)))[0] : undefined
  const [studentRow] = await db.select().from(students).where(eq(students.id, booking.studentId))
  const studentUser = studentRow ? (await db.select().from(users).where(eq(users.id, studentRow.userId)))[0] : undefined

  const roomLabel = room ? `Room ${room.roomNumber}${property ? ` at ${property.name}` : ''}` : 'this room'

  if (resolutionType === 'refund') {
    try {
      await db.transaction(async (tx) => {
        await tx.update(bookings).set({
          status: 'cancelled',
          disputeStatus: 'resolved_refund',
        }).where(eq(bookings.id, bookingId))

        if (room?.status === 'booked') {
          await tx.update(rooms).set({ status: 'available' }).where(eq(rooms.id, booking.roomId))
        }
      })

      if (studentUser) {
        await createNotification(
          studentUser.id,
          `Your dispute for ${roomLabel} was resolved in your favor. Your refund is being processed and should reflect within 5 to 10 business days.`,
          'dispute_resolved'
        )
        sendEmail({
          to: studentUser.email,
          subject: 'Your Netlodge dispute has been resolved',
          html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;"><h2 style="color:#f97316;">Dispute resolved in your favor</h2><p style="color:#374151;">Hi ${studentUser.firstName}, we reviewed your dispute for ${roomLabel} and have approved a refund. Booking reference: ${booking.bookingRef}. Your refund is being processed and should reflect within 5 to 10 business days.</p></div>`,
        }).catch((err) => console.error('dispute refund email failed', err))
      }

      if (property) {
        const [landlordRow] = await db.select().from(landlords).where(eq(landlords.id, property.landlordId))
        if (landlordRow) {
          const [landlordUser] = await db.select().from(users).where(eq(users.id, landlordRow.userId))
          if (landlordUser) {
            await createNotification(
              landlordUser.id,
              `The dispute for ${roomLabel} was resolved in the student's favor. The booking has been cancelled and the room is available again.`,
              'dispute_resolved'
            )
          }
        }
      }

      revalidatePath('/admin/disputes')
      revalidatePath('/admin')
      revalidatePath('/landlord/bookings')
      return { success: true }
    } catch (err) {
      console.error('resolveDispute (refund) failed', err)
      return { error: 'Could not resolve this dispute. Please try again.' }
    }
  }

  // resolutionType === 'release'
  if (!property) return { error: 'Could not find the property for this booking.' }

  const [landlordRow] = await db.select().from(landlords).where(eq(landlords.id, property.landlordId))
  if (!landlordRow) return { error: 'Could not find the landlord for this booking.' }

  if (!landlordRow.bankAccountNumberEncrypted || !landlordRow.bankName || !landlordRow.bankAccountName) {
    return { error: 'This landlord has no payout bank account on file. Cannot release funds automatically.' }
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) return { error: 'Payments are not configured.' }

  try {
    const bankCode = await resolveBankCode(landlordRow.bankName, secretKey)
    if (!bankCode) return { error: `Could not resolve bank code for "${landlordRow.bankName}".` }

    const accountNumber = decryptAccountNumberFromBase64(landlordRow.bankAccountNumberEncrypted)
    const recipientCode = await createTransferRecipient(secretKey, accountNumber, bankCode, landlordRow.bankAccountName)
    if (!recipientCode) return { error: 'Could not create Paystack transfer recipient.' }

    const payoutAmountKobo = Math.round(Number(booking.roomPrice) * 100)
    const transferResult = await initiateTransfer(
      secretKey,
      recipientCode,
      payoutAmountKobo,
      `Netlodge dispute-resolved escrow release — booking ${booking.bookingRef}`
    )

    if ('error' in transferResult) return { error: transferResult.error }

    await db.update(bookings).set({
      disputeStatus: 'resolved_release',
      escrowReleasedAt: new Date(),
      landlordPayoutReference: transferResult.reference,
    }).where(eq(bookings.id, bookingId))

    const [landlordUser] = await db.select().from(users).where(eq(users.id, landlordRow.userId))
    if (landlordUser) {
      await createNotification(
        landlordUser.id,
        `The dispute for ${roomLabel} was resolved in your favor. Your payment has been released.`,
        'dispute_resolved'
      )
    }
    if (studentUser) {
      await createNotification(
        studentUser.id,
        `Your dispute for ${roomLabel} was reviewed and resolved in the landlord's favor. Funds have been released.`,
        'dispute_resolved'
      )
    }

    revalidatePath('/admin/disputes')
    revalidatePath('/admin')
    revalidatePath('/landlord/bookings')
    revalidatePath('/landlord/payments')
    return { success: true }
  } catch (err) {
    console.error('resolveDispute (release) failed', err)
    return { error: 'Could not release funds. Please try again.' }
  }
}