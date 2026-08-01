// proxy.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const PROTECTED_PREFIXES = ['/dashboard', '/landlord', '/booking', '/profile', '/saved', '/complete-profile']
const AUTH_PAGES = ['/login', '/signup']
const LANDLORD_ONLY_PREFIX = '/landlord'
const STUDENT_ONLY_PREFIXES = ['/dashboard', '/saved', '/booking']
const COMPLETE_PROFILE_PATH = '/complete-profile'

export default auth((req) => {
  const { nextUrl } = req
  const pathname = nextUrl.pathname
  const isLoggedIn = !!req.auth
  const role = req.auth?.user?.role
  const roleRecordId = req.auth?.user?.roleRecordId

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p))

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Google sign-ups land here with role='student' but no students row yet.
  // Force profile completion before any protected route is reachable.
  if (isProtected && isLoggedIn && role === 'student' && !roleRecordId && pathname !== COMPLETE_PROFILE_PATH) {
    return NextResponse.redirect(new URL(COMPLETE_PROFILE_PATH, nextUrl.origin))
  }

  if (isAuthPage && isLoggedIn) {
    const redirectTo = role === 'landlord' ? '/landlord/dashboard' : '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, nextUrl.origin))
  }

  if (isLoggedIn && pathname.startsWith(LANDLORD_ONLY_PREFIX) && role !== 'landlord') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl.origin))
  }

  if (isLoggedIn && STUDENT_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && role === 'landlord') {
    return NextResponse.redirect(new URL('/landlord/dashboard', nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}