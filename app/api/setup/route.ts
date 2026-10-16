import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { countUsers, createUser, emailExists } from '@/lib/users'
import { errorResponse, safeJsonParse } from '@/lib/api'

// DB-backed: always run per-request (the needsSetup result depends on live data).
export const dynamic = 'force-dynamic'

// First-run onboarding. While the users table is empty, anyone can create the
// first admin account. Once a user exists, this endpoint is locked.

export async function GET() {
  try {
    const needsSetup = (await countUsers()) === 0
    return NextResponse.json({ needsSetup })
  } catch (error) {
    return errorResponse(error, 'GET /api/setup')
  }
}

export async function POST(request: NextRequest) {
  const jsonResult = await safeJsonParse(request)
  if ('error' in jsonResult) {
    return jsonResult.error
  }

  try {
    if ((await countUsers()) > 0) {
      return NextResponse.json({ error: 'Setup already completed' }, { status: 403 })
    }

    const body = jsonResult.data as { name?: string; email?: string; password?: string }
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email and password are required' },
        { status: 400 }
      )
    }
    if (String(password).length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }
    if (await emailExists(String(email))) {
      return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 })
    }

    const user = await createUser({
      name: String(name),
      email: String(email),
      password: String(password),
      role: 'admin',
    })

    await createSession(user)
    return NextResponse.json({ success: true, user }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'POST /api/setup')
  }
}
