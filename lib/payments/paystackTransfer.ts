// lib/payments/paystackTransfer.ts
//
// Extracted from the escrow-release cron job so the admin dispute-resolution
// action can trigger the exact same landlord payout path without duplicating
// the Paystack integration logic in two places.

const PAYSTACK_BASE_URL = 'https://api.paystack.co'

export async function resolveBankCode(bankName: string, secretKey: string): Promise<string | null> {
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

export async function createTransferRecipient(
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

export async function initiateTransfer(
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

// Convenience wrapper used by both the cron job and admin dispute
// resolution — resolves bank code, creates a recipient, and fires the
// transfer in one call.
export async function payoutToLandlordBank(
  secretKey: string,
  bankName: string,
  accountNumberDecrypted: string,
  accountName: string,
  amountKobo: number,
  reason: string
): Promise<{ reference: string } | { error: string }> {
  const bankCode = await resolveBankCode(bankName, secretKey)
  if (!bankCode) return { error: `Could not resolve bank code for "${bankName}"` }

  const recipientCode = await createTransferRecipient(secretKey, accountNumberDecrypted, bankCode, accountName)
  if (!recipientCode) return { error: 'Could not create Paystack transfer recipient' }

  return initiateTransfer(secretKey, recipientCode, amountKobo, reason)
}