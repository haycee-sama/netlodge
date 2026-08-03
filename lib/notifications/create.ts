// lib/notifications/create.ts
//
// Deliberately NOT a 'use server' action file. Every top-level export in a
// 'use server' file becomes a callable endpoint reachable from the client
// with attacker-controlled arguments. createNotification() takes an
// arbitrary userId — if it lived in lib/actions/notifications.ts, anyone
// could call it to spam notifications into any other user's inbox. It's
// imported and called only from other server-side code (other server
// actions, webhooks, cron routes), never invoked directly from a client
// component.

import { db } from '../db'
import { notifications } from '../db/schema'
import { sendEmail } from '../email/sendEmail'
import { verificationStatusEmailHtml } from '../email/sendEmail'

export type NotificationType =
  | 'booking_confirmed' | 'new_booking' | 'dispute_filed' | 'dispute_resolved'
  | 'kyc_approved' | 'kyc_rejected' | 'general'

export async function createNotification(userId: string, message: string, type: NotificationType) {
  try {
    await db.insert(notifications).values({ userId, message, type })
  } catch (err) {
    // Notifications are best-effort — never let this throw and abort
    // whatever booking/payment/dispute flow triggered it.
    console.error('createNotification failed', err)
  }
}

// Call this from wherever admin KYC approval/rejection happens (not present
// in the current codebase — no admin routes were provided). Wire it into
// that action once it exists, passing the affected user's id/email/name.
export async function notifyVerificationStatusChange(
  userId: string,
  userEmail: string,
  firstName: string,
  role: 'student' | 'landlord',
  status: 'approved' | 'rejected'
) {
  const message = status === 'approved'
    ? `Your ${role} verification has been approved. You can now ${role === 'landlord' ? 'list properties' : 'book rooms'} on Netlodge.`
    : `Your ${role} verification was not approved. Please review and resubmit your documents.`

  await createNotification(userId, message, status === 'approved' ? 'kyc_approved' : 'kyc_rejected')

  sendEmail({
    to: userEmail,
    subject: status === 'approved' ? 'You are verified on Netlodge! 🎉' : 'Netlodge verification update',
    html: verificationStatusEmailHtml(firstName, role, status),
  }).catch((err) => console.error('verification status email failed', err))
}