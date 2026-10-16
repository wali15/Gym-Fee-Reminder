import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from '@/lib/api'
import { getUserByEmail, updateUser } from '@/lib/users'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(`${request.nextUrl.origin}/profile?error=Google_SignIn_failed`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${request.nextUrl.origin}/profile?error=Invalid_Google_response`)
    }

    // Verify state parameter to prevent CSRF
    const cookieStore = await request.cookies()
    const storedState = cookieStore.get('oauth_state')?.value
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${request.nextUrl.origin}/profile?error=Invalid_state_parameter`)
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${request.nextUrl.origin}/profile?error=Google_OAuth_not_configured`)
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    const tokens = await tokenResponse.json()

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info')
    }

    const googleUser = await userInfoResponse.json()

    // Clear the state cookie
    cookieStore.delete('oauth_state')

    // Find the user by email (to link Google account)
    const existingUser = await getUserByEmail(googleUser.email)
    if (existingUser) {
      // Update the user's google_id
      await updateUser(existingUser.id, {
        // We don't want to change name, email, or role, so we pass undefined for those
        // But we need to update google_id, so we'll create a separate function or pass an object with google_id
        // However, updateUser currently only accepts name, email, role.
        // Let's create a temporary solution: we'll update the google_id directly via db.
        // Alternatively, we can extend updateUser to accept google_id, but for simplicity, we'll do a direct update.
        // We'll do that after the updateUser call? Actually, we can't use updateUser for google_id.
        // We'll update the user's google_id using the db client directly.
        // We'll do it after the updateUser call? We don't want to call updateUser because it doesn't handle google_id.
        // So we'll skip updateUser and do a direct update.
      })
    }

    // Update google_id directly in the database
    const client = await import('@/lib/db').then(mod => mod.getClient())
    await client.execute({
      sql: 'UPDATE users SET google_id = ?, updated_at = datetime(\'now\') WHERE email = ?',
      args: [googleUser.id, googleUser.email],
    })

    // Redirect back to profile with success indicator
    return NextResponse.redirect(`${request.nextUrl.origin}/profile?google_sso=success&email=${encodeURIComponent(googleUser.email)}&name=${encodeURIComponent(googleUser.name)}`)
  } catch (error) {
    console.error('Google SSO callback error:', error)
    return errorResponse(error, 'GET /api/auth/google/callback')
  }
}
