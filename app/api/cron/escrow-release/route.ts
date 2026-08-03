// app/api/cron/escrow-release/route.ts
import { NextResponse } from 'next/server'
import { eq, and, lt, isNull } from 'drizzle-orm'
import { db } from '../../../../lib/db'
import { bookings, rooms, properties, landlords } from '../../../../lib/db/schema'
import { decryptAccountNumberFromBase64 } from '../../../../lib/crypto/bankAccount'

const PAYSTACK_BASE_URL = 'https://api.paystack.co'
const ESCROW_WINDOW_HOURS = 48

// Paystack requires a bank_code, but landlords only ever entered a bank
// NAME (see NIGERIAN_BANKS in LandlordProfileClient.jsx). Resolve the code
// at call time against Paystack's own bank list rather than hardcoding a
// name→code map that will silently drift out of date.
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

export async function GET(request: Request) {
  const secretForAuth = process.env.CRON_SECRET
  if (!secretForAuth) {
    console.error('CRON_SECRET not set — rejecting cron request')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${secretForAuth}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
  if (!paystackSecretKey) {
    console.error('PAYSTACK_SECRET_KEY not set — cannot process escrow release')
    return NextResponse.json({ error: 'Payments not configured' }, { status: 500 })
  }

  const cutoff = new Date(Date.now() - ESCROW_WINDOW_HOURS * 60 * 60 * 1000)

  // Eligible: confirmed + paid + no dispute + not already released + paid
  // more than 48h ago.
  const eligible = await db.select().from(bookings).where(
    and(
      eq(bookings.status, 'confirmed'),
      eq(bookings.paymentStatus, 'paid'),
      eq(bookings.disputeStatus, 'none'),
      isNull(bookings.escrowReleasedAt),
      lt(bookings.paidAt, cutoff)
    )
  )

  const results: { bookingId: string; ok: boolean; message: string }[] = []

  // Cache bank-code lookups per run — multiple bookings often share a bank.
  const bankCodeCache = new Map<string, string | null>()

  for (const booking of eligible) {
    try {
      const [room] = await db.select().from(rooms).where(eq(rooms.id, booking.roomId))
      if (!room) throw new Error('Room not found')

      const [property] = await db.select().from(properties).where(eq(properties.id, room.propertyId))
      if (!property) throw new Error('Property not found')

      const [landlord] = await db.select().from(landlords).where(eq(landlords.id, property.landlordId))
      if (!landlord) throw new Error('Landlord not found')

      if (!landlord.bankAccountNumberEncrypted || !landlord.bankName || !landlord.bankAccountName) {
        throw new Error('Landlord has no payout bank account on file')
      }

      let bankCode = bankCodeCache.get(landlord.bankName)
      if (bankCode === undefined) {
        bankCode = await resolveBankCode(landlord.bankName, paystackSecretKey)
        bankCodeCache.set(landlord.bankName, bankCode)
      }
      if (!bankCode) throw new Error(`Could not resolve bank code for "${landlord.bankName}"`)

      const accountNumber = decryptAccountNumberFromBase64(landlord.bankAccountNumberEncrypted)

      const recipientCode = await createTransferRecipient(
        paystackSecretKey,
        accountNumber,
        bankCode,
        landlord.bankAccountName
      )
      if (!recipientCode) throw new Error('Could not create Paystack transfer recipient')

      const payoutAmountKobo = Math.round(Number(booking.roomPrice) * 100) // landlord gets room price, not the service fee
      const transferResult = await initiateTransfer(
        paystackSecretKey,
        recipientCode,
        payoutAmountKobo,
        `Netlodge escrow release — booking ${booking.bookingRef}`
      )

      if ('error' in transferResult) throw new Error(transferResult.error)

      await db.update(bookings).set({
        escrowReleasedAt: new Date(),
        landlordPayoutReference: transferResult.reference,
      }).where(eq(bookings.id, booking.id))

      results.push({ bookingId: booking.id, ok: true, message: `Released — ref ${transferResult.reference}` })
    } catch (err: any) {
      console.error(`Escrow release failed for booking ${booking.id}`, err)
      results.push({ bookingId: booking.id, ok: false, message: err?.message ?? 'Unknown error' })
    }
  }

  return NextResponse.json({
    processed: eligible.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  })
}