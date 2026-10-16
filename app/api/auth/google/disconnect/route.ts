import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { getClient } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = Number(session.sub)

    // Update the user's google_id to NULL
    const client = getClient()
    await client.execute({
      sql: 'UPDATE users SET google_id = NULL, updated_at = datetime(\'now\') WHERE id = ?',
      args: [userId],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Google SSO disconnect error:', error)
    return errorResponse(error, 'PUT /api/auth/google/disconnect')
  }
}