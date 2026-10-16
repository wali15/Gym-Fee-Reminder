import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { clientId, clientSecret } = await request.json()

    // Basic validation
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Client ID and Client Secret are required' },
        { status: 400 }
      )
    }

    // Test the credentials by making a request to Google's token endpoint
    // We'll use the client credentials flow to verify the credentials are valid
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        scope: 'https://www.googleapis.com/auth/userinfo.email',
      }),
    })

    // If we get a successful response, the credentials are valid
    if (tokenResponse.ok) {
      return NextResponse.json({ valid: true })
    } else {
      // Try to get more specific error info from Google
      const errorData = await tokenResponse.json()
      return NextResponse.json(
        { error: errorData.error_description || 'Invalid Client ID or Client Secret' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Google SSO verify error:', error)
    return errorResponse(error, 'POST /api/auth/google/verify')
  }
}