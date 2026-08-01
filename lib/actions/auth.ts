// lib/actions/auth.ts
'use server'

import bcrypt from 'bcryptjs'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import { users, students, landlords, universities, emailOtps } from '../db/schema'
import { sendEmail, otpEmailHtml } from '../email/sendEmail'

const EMAIL_REGEX = /^\S+@\S+\.\S+$/
const PHONE_REGEX = /^0\d{10}$/
const OTP_TTL_MINUTES = 10
const MAX_OTP_ATTEMPTS = 5

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000)) // 6-digit
}

async function issueOtp(userId: string, purpose: 'email_verification' | 'password_reset') {
  const code = generateOtpCode()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000)

  // Invalidate any prior unconsumed codes of the same purpose for this user
  await db.delete(emailOtps).where(and(eq(emailOtps.userId, userId), eq(emailOtps.purpose, purpose)))
  await db.insert(emailOtps).values({ userId, purpose, codeHash, expiresAt })

  return code
}

async function sendOtpEmail(email: string, code: string, purpose: 'email_verification' | 'password_reset') {
  await sendEmail({
    to: email,
    subject: purpose === 'email_verification' ? 'Verify your Netlodge email' : 'Reset your Netlodge password',
    html: otpEmailHtml(code, purpose),
  })
}

async function verifyOtpForUser(
  userId: string,
  purpose: 'email_verification' | 'password_reset',
  submittedCode: string
): Promise<{ success: true } | { error: string }> {
  const [record] = await db.select().from(emailOtps)
    .where(and(eq(emailOtps.userId, userId), eq(emailOtps.purpose, purpose)))
    .orderBy(desc(emailOtps.createdAt))
    .limit(1)

  if (!record) return { error: 'No verification code found. Please request a new one.' }
  if (record.consumedAt) return { error: 'This code has already been used.' }
  if (record.expiresAt < new Date()) return { error: 'This code has expired. Please request a new one.' }
  if (record.attempts >= MAX_OTP_ATTEMPTS) return { error: 'Too many incorrect attempts. Please request a new code.' }

  const matches = await bcrypt.compare(submittedCode.trim(), record.codeHash)
  if (!matches) {
    await db.update(emailOtps).set({ attempts: record.attempts + 1 }).where(eq(emailOtps.id, record.id))
    return { error: 'Incorrect code. Please try again.' }
  }

  await db.update(emailOtps).set({ consumedAt: new Date() }).where(eq(emailOtps.id, record.id))
  return { success: true }
}

// ════════════════════════════════════════════════════════════
// STUDENT SIGNUP
// ════════════════════════════════════════════════════════════
type SignupStudentInput = {
  firstName: string; lastName: string; email: string; phone: string
  universityName: string; course: string; year: string; password: string; confirmPassword: string
}

export async function signupStudent(input: SignupStudentInput): Promise<{ success: true } | { error: string }> {
  const { firstName, lastName, email, phone, universityName, course, year, password, confirmPassword } = input

  if (!firstName?.trim() || !lastName?.trim()) return { error: 'First and last name are required.' }
  if (!email?.trim() || !EMAIL_REGEX.test(email)) return { error: 'Enter a valid email address.' }
  if (!phone?.trim() || !PHONE_REGEX.test(phone)) return { error: 'Enter a valid 11-digit phone number.' }
  if (!universityName) return { error: 'Please select your university.' }
  if (!course?.trim()) return { error: 'Course is required.' }
  if (!year) return { error: 'Please select your year.' }
  if (!password || password.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (password !== confirmPassword) return { error: 'Passwords do not match.' }

  const normalizedEmail = email.trim().toLowerCase()

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1)
  if (existing) return { error: 'An account with this email already exists.' }

  const [university] = await db.select().from(universities).where(eq(universities.name, universityName)).limit(1)
  if (!university) return { error: 'Selected university was not found.' }

  const passwordHash = await bcrypt.hash(password, 10)

  let createdUserId: string | null = null

  try {
    const [user] = await db.insert(users).values({
      email: normalizedEmail, phone: phone.trim(), passwordHash, role: 'student',
      firstName: firstName.trim(), lastName: lastName.trim(),
    }).returning()

    createdUserId = user.id

    await db.insert(students).values({
      userId: user.id, universityId: university.id, course: course.trim(), yearLevel: year,
    })

    const code = await issueOtp(user.id, 'email_verification')
    await sendOtpEmail(normalizedEmail, code, 'email_verification')

    return { success: true }
  } catch (err) {
    console.error('signupStudent failed', err)

    // neon-http doesn't support real transactions, so if anything after
    // the users insert failed, manually remove the orphaned row rather
    // than leaving a half-created account behind.
    if (createdUserId) {
      try {
        await db.delete(users).where(eq(users.id, createdUserId))
      } catch (cleanupErr) {
        console.error('signupStudent rollback failed', cleanupErr)
      }
    }

    return { error: 'Could not create your account. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// LANDLORD SIGNUP
// ════════════════════════════════════════════════════════════
type SignupLandlordInput = {
  firstName: string; lastName: string; email: string; phone: string
  businessName?: string; password: string; confirmPassword: string
}

export async function signupLandlord(input: SignupLandlordInput): Promise<{ success: true } | { error: string }> {
  const { firstName, lastName, email, phone, businessName, password, confirmPassword } = input

  if (!firstName?.trim() || !lastName?.trim()) return { error: 'First and last name are required.' }
  if (!email?.trim() || !EMAIL_REGEX.test(email)) return { error: 'Enter a valid email address.' }
  if (!phone?.trim() || !PHONE_REGEX.test(phone)) return { error: 'Enter a valid 11-digit phone number.' }
  if (!password || password.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (password !== confirmPassword) return { error: 'Passwords do not match.' }

  const normalizedEmail = email.trim().toLowerCase()

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1)
  if (existing) return { error: 'An account with this email already exists.' }

  const passwordHash = await bcrypt.hash(password, 10)

  let createdUserId: string | null = null

  try {
    const [user] = await db.insert(users).values({
      email: normalizedEmail, phone: phone.trim(), passwordHash, role: 'landlord',
      firstName: firstName.trim(), lastName: lastName.trim(),
    }).returning()

    createdUserId = user.id

    await db.insert(landlords).values({ userId: user.id, businessName: businessName?.trim() || null })

    const code = await issueOtp(user.id, 'email_verification')
    await sendOtpEmail(normalizedEmail, code, 'email_verification')

    return { success: true }
  } catch (err) {
    console.error('signupLandlord failed', err)

    if (createdUserId) {
      try {
        await db.delete(users).where(eq(users.id, createdUserId))
      } catch (cleanupErr) {
        console.error('signupLandlord rollback failed', cleanupErr)
      }
    }

    return { error: 'Could not create your account. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// EMAIL OTP VERIFICATION
// ════════════════════════════════════════════════════════════
export async function verifyEmailOtp(email: string, code: string): Promise<{ success: true } | { error: string }> {
  if (!email || !code) return { error: 'Missing email or code.' }

  const normalizedEmail = email.trim().toLowerCase()
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)
  if (!user) return { error: 'Account not found.' }
  if (user.isEmailVerified) return { success: true }

  const result = await verifyOtpForUser(user.id, 'email_verification', code)
  if ('error' in result) return result

  await db.update(users).set({ isEmailVerified: true }).where(eq(users.id, user.id))
  return { success: true }
}

export async function resendOtp(
  email: string,
  purpose: 'email_verification' | 'password_reset'
): Promise<{ success: true } | { error: string }> {
  const normalizedEmail = email.trim().toLowerCase()
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)

  // Same generic response whether or not the account exists — prevents
  // using this endpoint to enumerate registered emails.
  if (!user) return { success: true }

  const code = await issueOtp(user.id, purpose)
  await sendOtpEmail(normalizedEmail, code, purpose)
  return { success: true }
}

// ════════════════════════════════════════════════════════════
// FORGOT / RESET PASSWORD
// ════════════════════════════════════════════════════════════
export async function requestPasswordReset(email: string): Promise<{ success: true }> {
  const normalizedEmail = email?.trim().toLowerCase()
  if (normalizedEmail && EMAIL_REGEX.test(normalizedEmail)) {
    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)
    if (user && user.passwordHash) { // OAuth-only accounts have nothing to reset
      const code = await issueOtp(user.id, 'password_reset')
      await sendOtpEmail(normalizedEmail, code, 'password_reset')
    }
  }
  // Always returns success — same reasoning as resendOtp above.
  return { success: true }
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: true } | { error: string }> {
  if (!newPassword || newPassword.length < 8) return { error: 'Password must be at least 8 characters.' }

  const normalizedEmail = email?.trim().toLowerCase()
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)
  if (!user) return { error: 'Invalid code or email.' }

  const result = await verifyOtpForUser(user.id, 'password_reset', code)
  if ('error' in result) return result

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id))
  return { success: true }
}