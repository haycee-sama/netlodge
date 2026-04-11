// middleware.js
// Passes the current pathname as a header so the root layout
// can conditionally show/hide the navbar and footer

import { NextResponse } from 'next/server'

export function middleware(request) {
  const response = NextResponse.next()
  // Attach the pathname so layout.jsx can read it
  response.headers.set('x-pathname', request.nextUrl.pathname)
  return response
}

export const config = {
  // Run on all routes except static files and Next.js internals
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}