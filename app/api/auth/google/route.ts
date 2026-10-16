import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`
    const scope = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid'
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    if (!clientId) {
      return NextResponse.json({ error: 'Google Client ID is missing' }, { status: 400 })
    }

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', clientId)
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('scope', scope)
    googleAuthUrl.searchParams.set('access_type', 'offline')
    googleAuthUrl.searchParams.set('prompt', 'consent')
    googleAuthUrl.searchParams.set('state', state)

    const redirectRes = NextResponse.redirect(googleAuthUrl.toString())
    redirectRes.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10, // 10 minutes
    })
    
    return redirectRes
  } catch (error) {
    return errorResponse(error, 'GET /api/auth/google')
  }
}
