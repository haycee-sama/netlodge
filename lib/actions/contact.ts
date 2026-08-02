// lib/actions/contact.ts
'use server'

import { sendEmail } from '../email/sendEmail'

const EMAIL_REGEX = /^\S+@\S+\.\S+$/

const QUERY_TYPE_LABELS: Record<string, string> = {
  student: 'Student — booking or account issue',
  landlord: 'Landlord — listing or KYC issue',
  payment: 'Payment or escrow question',
  dispute: 'Dispute',
  fraud: 'Fraud report',
  other: 'Other',
}

export async function submitContactForm(input: {
  name: string
  email: string
  phone?: string
  queryType: string
  message: string
}): Promise<{ success: true } | { error: string }> {
  const name = input.name?.trim()
  const email = input.email?.trim().toLowerCase()
  const message = input.message?.trim()

  if (!name) return { error: 'Please enter your name.' }
  if (!email || !EMAIL_REGEX.test(email)) return { error: 'Please enter a valid email address.' }
  if (!input.queryType) return { error: 'Please select a query type.' }
  if (!message) return { error: 'Please enter your message.' }

  const queryLabel = QUERY_TYPE_LABELS[input.queryType] ?? input.queryType

  try {
    const result = await sendEmail({
      to: 'hello@netlodge.ng',
      subject: `[Contact] ${queryLabel} — ${name}`,
      html: `
        <div style="font-family: sans-serif;">
          <h2 style="color:#f97316;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${input.phone?.trim() || '—'}</p>
          <p><strong>Query Type:</strong> ${queryLabel}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
      `,
    })

    if (!result.success) {
      return { error: 'Could not send your message right now. Please try again or email us directly.' }
    }

    return { success: true }
  } catch (err) {
    console.error('submitContactForm failed', err)
    return { error: 'Could not send your message right now. Please try again or email us directly.' }
  }
}