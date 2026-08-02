// app/api/webhooks/paystack/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { finalizeConfirmedBooking } from '../../../../lib/actions/booking'

export async function POST(req: Request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    console.error('PAYSTACK_SECRET_KEY not set — rejecting webhook')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  // Read the raw body BEFORE any JSON parsing — Paystack's signature is
  // computed over the exact raw bytes sent, not a re-serialized object.
  const rawBody = await req.text()

  const signature = req.headers.get('x-paystack-signature')
  const expectedSignature = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex')

  if (!signature || signature !== expectedSignature) {
    console.error('Paystack webhook signature mismatch — rejecting')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (event?.event === 'charge.success') {
    const reference = event?.data?.reference
    if (reference) {
      // finalizeConfirmedBooking re-verifies independently against
      // Paystack's API rather than trusting this payload's fields —
      // this call is a trigger, not a source of truth.
      const result = await finalizeConfirmedBooking(reference)
      if ('error' in result) {
        console.error('Webhook finalize failed', reference, result.error)
      }
    }
  }

  // Always 200 once the signature checks out, quickly — Paystack retries
  // on non-2xx/timeout, and any downstream failure is already logged
  // above and independently recoverable via the success-page fallback.
  return NextResponse.json({ received: true }, { status: 200 })
}