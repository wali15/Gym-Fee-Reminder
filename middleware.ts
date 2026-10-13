import { NextResponse, type NextRequest } from 'next/server'

// Lightweight UX gate: redirect to /login when the session cookie is absent on
// a protected route, so protected pages don't flash before their client-side
// fetch 401s. This is intentionally a presence-only check — it does NOT verify
// the JWT. Real authentication and all role checks happen server-side in the
// API routes (requireAuth / requireAdmin), which is where data is actually
// accessed. Keeping crypto/DB out of the Edge runtime is what lets the session
// secret live in the database (zero-config) without an Edge-visible env var.
//
// NOTE: cookie name must match SESSION_COOKIE in lib/auth.ts.
const SESSION_COOKIE = 'admin_session'

const PROTECTED_PREFIXES = ['/dashboard', '/members', '/profile', '/settings', '/users']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
  if (!isProtected) return NextResponse.next()

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/members/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/users/:path*',
  ],
}
