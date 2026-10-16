import { NextRequest, NextResponse } from 'next/server'
import { createSession, deleteSession, getSession, verifyPassword } from '@/lib/auth'
import { getUserByEmail } from '@/lib/users'
import { errorResponse, safeJsonParse } from '@/lib/api'

// Auth/DB-backed: always run per-request (reads the session cookie).
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const jsonResult = await safeJsonParse(request)
  if ('error' in jsonResult) {
    return jsonResult.error
  }

  const body = jsonResult.data as { email?: string; password?: string; action?: string }
  const { email, password, action } = body

  if (action === 'logout') {
    await deleteSession()
    return NextResponse.json({ success: true })
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const user = await getUserByEmail(String(email))
  // Verify even when the user is missing to keep timing roughly uniform.
  const isValid = await verifyPassword(String(password), user?.password_hash ?? '')

  if (!user || !isValid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  await createSession(user)
  return NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
  })
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    return NextResponse.json({
      authenticated: true,
      user: {
        id: Number(session.sub),
        email: session.email,
        role: session.role,
        name: session.name,
      },
    })
  } catch (error) {
    return errorResponse(error, 'GET /api/auth')
  }
}
