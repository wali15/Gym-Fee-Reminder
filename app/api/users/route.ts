import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createUser, emailExists, listUsers } from '@/lib/users'
import { errorResponse } from '@/lib/api'

// Auth/DB-backed: always run per-request (reads the session cookie).
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
    const users = await listUsers()
    return NextResponse.json({ users })
  } catch (error) {
    return errorResponse(error, 'GET /api/users')
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const { name, email, password, role } = await request.json()

    if (!name || !email || !password) {
      return errorResponse(new Error('Name, email and password are required'), 'POST /api/users')
    }
    if (String(password).length < 8) {
      return errorResponse(new Error('Password must be at least 8 characters'), 'POST /api/users')
    }
    if (await emailExists(String(email))) {
      return errorResponse(new Error('That email is already in use'), 'POST /api/users')
    }

    const user = await createUser({
      name: String(name),
      email: String(email),
      password: String(password),
      role: role === 'admin' ? 'admin' : 'standard',
    })
    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'POST /api/users')
  }
}
