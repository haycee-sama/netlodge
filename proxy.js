// proxy.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const PROTECTED_PREFIXES = ['/dashboard', '/landlord', '/booking', '/profile', '/saved', '/complete-profile', '/admin']
const AUTH_PAGES = ['/login', '/signup']

const VERIFY_PROTECTED_PREFIXES = ['/verify/student', '/verify/status']

const LANDLORD_ONLY_PREFIX = '/landlord'
const ADMIN_ONLY_PREFIX = '/admin'
const STUDENT_ONLY_PREFIXES = ['/dashboard', '/saved', '/booking', '/profile', '/complete-profile']
const COMPLETE_PROFILE_PATH = '/complete-profile'
const LANDLORD_KYC_PATH = '/landlord/kyc'

function dashboardFor(role) {
  if (role === 'landlord') return '/landlord/dashboard'
  if (role === 'admin') return '/admin'
  return '/dashboard'
}

export default auth((req) => {
  const { nextUrl } = req
  const pathname = nextUrl.pathname
  const isLoggedIn = !!req.auth
  const role = req.auth?.user?.role
  const roleRecordId = req.auth?.user?.roleRecordId
  const isEmailVerified = req.auth?.user?.isEmailVerified
  const email = req.auth?.user?.email

  const isProtected =
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
    VERIFY_PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p))

  // 1. Not logged in on a protected route → login, preserving destination.
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Google sign-ups land here with role='student' but no students row yet.
  if (isProtected && isLoggedIn && role === 'student' && !roleRecordId && pathname !== COMPLETE_PROFILE_PATH) {
    return NextResponse.redirect(new URL(COMPLETE_PROFILE_PATH, nextUrl.origin))
  }

  // 3. Mirrors #2 for landlords.
  if (isProtected && isLoggedIn && role === 'landlord' && !roleRecordId && pathname !== LANDLORD_KYC_PATH) {
    return NextResponse.redirect(new URL(LANDLORD_KYC_PATH, nextUrl.origin))
  }

  // 4. Unverified email blocked from protected routes (defense-in-depth —
  // authorize() already refuses to issue a session for unverified
  // credentials users).
  if (isProtected && isLoggedIn && isEmailVerified === false && !pathname.startsWith('/verify/email')) {
    const verifyUrl = new URL('/verify/email', nextUrl.origin)
    if (email) verifyUrl.searchParams.set('email', email)
    if (role) verifyUrl.searchParams.set('role', role)
    return NextResponse.redirect(verifyUrl)
  }

  // 5. Logged-in user on an auth page → their dashboard.
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL(dashboardFor(role), nextUrl.origin))
  }

  // 6. Admin-only routes. Checked before the landlord/student checks below
  // since /admin doesn't overlap either of those prefix lists, but ordering
  // here keeps all role-gates grouped together.
  if (isLoggedIn && pathname.startsWith(ADMIN_ONLY_PREFIX) && role !== 'admin') {
    return NextResponse.redirect(new URL(dashboardFor(role), nextUrl.origin))
  }

  // 7. Landlord-only routes.
  if (isLoggedIn && pathname.startsWith(LANDLORD_ONLY_PREFIX) && role !== 'landlord') {
    return NextResponse.redirect(new URL(dashboardFor(role), nextUrl.origin))
  }

  // 8. Student-only routes — also block admins, not just landlords, since
  // an admin account has no students/roleRecordId row and these pages
  // assume one exists.
  if (isLoggedIn && STUDENT_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && role !== 'student') {
    return NextResponse.redirect(new URL(dashboardFor(role), nextUrl.origin))
  }

  return NextResponse.next()
})

// NOTE: excludes /api entirely — every API route self-authenticates
// (uploadthing middleware, Paystack webhook HMAC, server actions' own
// auth() calls, and now requireAdmin() in lib/actions/admin.ts). Any new
// /api/* route MUST call auth() or equivalent itself.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}