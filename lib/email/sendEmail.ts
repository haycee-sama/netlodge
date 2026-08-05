// lib/email/sendEmail.ts
import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResendClient() {
  if (resendClient) return resendClient
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not set in .env.local')
  }
  resendClient = new Resend(apiKey)
  return resendClient
}

const DEFAULT_FROM = process.env.EMAIL_FROM || 'Netlodge <customers@netlodge.com>'

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  // Fails soft if the API key isn't configured — logs instead of
  // crashing signup/reset flows during local dev before .env is set up.
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email:DEV FALLBACK] To: ${to} | Subject: ${subject}\n${html}`)
    return { success: true, devFallback: true }
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: DEFAULT_FROM,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('sendEmail failed', error)
      return { success: false }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    console.error('sendEmail failed', err)
    return { success: false }
  }
}

export function otpEmailHtml(code: string, purpose: 'email_verification' | 'password_reset') {
  const heading = purpose === 'email_verification' ? 'Verify your email' : 'Reset your password'
  const body = purpose === 'email_verification'
    ? 'Use the code below to verify your Netlodge account. It expires in 10 minutes.'
    : 'Use the code below to reset your Netlodge password. It expires in 10 minutes.'
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#f97316;">${heading}</h2>
      <p style="color:#374151;">${body}</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #fff7ed; color: #ea580c; padding: 16px 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
        ${code}
      </div>
      <p style="color:#9ca3af; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `
}

export function welcomeEmailHtml(firstName: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#f97316;">Welcome to Netlodge, ${firstName}! 🎉</h2>
      <p style="color:#374151;">
        Your account is verified and ready to go. Browse thousands of verified,
        escrow-protected student rooms across Abuja, Lagos, and Enugu.
      </p>
      <a href="https://netlodge.ng/search"
         style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;
                border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">
        Browse Verified Rooms
      </a>
      <p style="color:#9ca3af; font-size: 13px; margin-top: 24px;">
        You're receiving this because you signed up for Netlodge with Google.
      </p>
    </div>
  `
}

export function bookingConfirmedEmailHtml(firstName: string, roomLabel: string, bookingRef: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#f97316;">Booking confirmed, ${firstName}! 🎉</h2>
      <p style="color:#374151;">
        Your booking for <strong>${roomLabel}</strong> is confirmed and your payment is now held in escrow.
      </p>
      <div style="background:#fff7ed;color:#ea580c;padding:12px 20px;border-radius:12px;margin:20px 0;font-weight:bold;">
        Booking Reference: ${bookingRef}
      </div>
      <p style="color:#374151;">You have 48 hours to visit the room and confirm it matches the listing. If it doesn't, you can file a dispute from your bookings page.</p>
    </div>
  `
}

export function newBookingEmailHtml(firstName: string, roomLabel: string, bookingRef: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#f97316;">You have a new booking, ${firstName}!</h2>
      <p style="color:#374151;">
        <strong>${roomLabel}</strong> has just been booked and paid for.
      </p>
      <div style="background:#fff7ed;color:#ea580c;padding:12px 20px;border-radius:12px;margin:20px 0;font-weight:bold;">
        Booking Reference: ${bookingRef}
      </div>
      <p style="color:#374151;">Funds are held in escrow for 48 hours before being released to your registered bank account.</p>
    </div>
  `
}

export function disputeFiledLandlordEmailHtml(firstName: string, roomLabel: string, reason: string, bookingRef: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#dc2626;">A dispute was filed — ${roomLabel}</h2>
      <p style="color:#374151;">Hi ${firstName}, a student has filed a dispute on booking <strong>${bookingRef}</strong>.</p>
      <div style="background:#fef2f2;color:#b91c1c;padding:12px 20px;border-radius:12px;margin:20px 0;">
        ${reason}
      </div>
      <p style="color:#374151;">Escrow release for this booking is paused while our team reviews. We may contact you for more information.</p>
    </div>
  `
}

export function disputeFiledStudentEmailHtml(firstName: string, roomLabel: string, bookingRef: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#f97316;">Your dispute has been filed</h2>
      <p style="color:#374151;">Hi ${firstName}, we've received your dispute for <strong>${roomLabel}</strong> (booking ${bookingRef}).</p>
      <p style="color:#374151;">Our team will review within 24 hours. Escrow funds are held until this is resolved.</p>
    </div>
  `
}

export function verificationStatusEmailHtml(firstName: string, role: 'student' | 'landlord', status: 'approved' | 'rejected', reason?: string) {
  const heading = status === 'approved' ? 'You are verified!' : 'Verification update needed'
  const body = status === 'approved'
    ? `Congratulations ${firstName}, your ${role} verification has been approved.`
    : `Hi ${firstName}, we were unable to verify your ${role} documents. Please log in and resubmit.`
  const reasonBlock = status === 'rejected' && reason
    ? `<div style="background:#fef2f2;color:#b91c1c;padding:12px 20px;border-radius:12px;margin:16px 0;"><strong>Reason:</strong> ${reason}</div>`
    : ''
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#f97316;">${heading}</h2>
      <p style="color:#374151;">${body}</p>
      ${reasonBlock}
    </div>
  `
}