// proxy.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const PROTECTED_PREFIXES = ['/dashboard', '/landlord', '/admin', '/booking', '/saved', '/profile', '/complete-profile']
const AUTH_PAGES = ['/login', '/signup']

// /verify/email is intentionally NOT protected — credentials signups land
// here while logged OUT (they can't log in until verified, per authorize()).
// /verify/student and /verify/status DO require a session, so they're
// listed explicitly rather than folded into a blanket '/verify' prefix.
const VERIFY_PROTECTED_PREFIXES = ['/verify/student', '/verify/status']

const LANDLORD_ONLY_PREFIX = '/landlord'
const ADMIN_ONLY_PREFIX = '/admin'
const STUDENT_ONLY_PREFIXES = ['/dashboard', '/saved', '/booking', '/profile', '/complete-profile']
const COMPLETE_PROFILE_PATH = '/complete-profile'
const LANDLORD_KYC_PATH = '/landlord/kyc'

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

  // 1. Not logged in on a protected route -> login, preserving destination.
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Google sign-ups land here with role='student' but no students row yet.
  // Force profile completion before any protected route is reachable.
  if (isProtected && isLoggedIn && role === 'student' && !roleRecordId && pathname !== COMPLETE_PROFILE_PATH) {
    return NextResponse.redirect(new URL(COMPLETE_PROFILE_PATH, nextUrl.origin))
  }

  // 3. Mirrors #2 for landlords. Under the current signup flow a landlords
  // row is always created alongside the user row, so this should be
  // unreachable in practice — it exists as defense-in-depth against future
  // signup paths (e.g. a landlord OAuth flow) that might not guarantee it.
  if (isProtected && isLoggedIn && role === 'landlord' && !roleRecordId && pathname !== LANDLORD_KYC_PATH) {
    return NextResponse.redirect(new URL(LANDLORD_KYC_PATH, nextUrl.origin))
  }

  // 4. Defense-in-depth: authorize() now refuses to issue a session for an
  // unverified credentials user, and Google accounts are marked verified at
  // creation, so isEmailVerified should already be true for any live
  // session reaching here. This catches stale/tampered JWTs or a future
  // admin "unverify" action. Skipped once they're already on /verify/email
  // to avoid a redirect loop.
  if (isProtected && isLoggedIn && isEmailVerified === false && !pathname.startsWith('/verify/email')) {
    const verifyUrl = new URL('/verify/email', nextUrl.origin)
    if (email) verifyUrl.searchParams.set('email', email)
    if (role) verifyUrl.searchParams.set('role', role)
    return NextResponse.redirect(verifyUrl)
  }

  // 5. Logged-in user on an auth page -> their dashboard.
  if (isAuthPage && isLoggedIn) {
    const redirectTo = role === 'admin' ? '/admin' : role === 'landlord' ? '/landlord/dashboard' : '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, nextUrl.origin))
  }

  // 6. Admin route separation. Checked ahead of the student/landlord checks
  // below since an admin session should never fall through into those
  // role-specific bounce rules. Any non-admin session (student or
  // landlord) hitting /admin/* is sent to their own dashboard, never shown
  // an error page that would confirm the route's existence.
  if (isLoggedIn && pathname.startsWith(ADMIN_ONLY_PREFIX) && role !== 'admin') {
    const redirectTo = role === 'landlord' ? '/landlord/dashboard' : '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, nextUrl.origin))
  }

  // 7. Landlord/student role separation.
  if (isLoggedIn && pathname.startsWith(LANDLORD_ONLY_PREFIX) && role !== 'landlord') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl.origin))
  }
  if (isLoggedIn && STUDENT_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && role === 'landlord') {
    return NextResponse.redirect(new URL('/landlord/dashboard', nextUrl.origin))
  }

  return NextResponse.next()
})

// NOTE: this matcher intentionally excludes everything under /api. Every
// existing API route self-authenticates (uploadthing middleware, Paystack
// webhook HMAC check, server actions' own auth() calls), so this is fine
// today — but it means the proxy provides zero backstop for API routes as a
// category. Any new /api/* route MUST call auth() or an equivalent check
// itself; nothing here will catch a route that forgets to.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}