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