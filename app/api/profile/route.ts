import { NextRequest, NextResponse } from 'next/server'
import { createSession, requireAuth, verifyPassword } from '@/lib/auth'
import {
  emailExists,
  getUserById,
  getUserWithHashById,
  updatePassword,
  updateUser,
} from '@/lib/users'
import { errorResponse } from '@/lib/api'

// Auth/DB-backed: always run per-request (reads the session cookie).
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await requireAuth()
    const user = await getUserById(Number(session.sub))
    if (!user) return errorResponse(new Error('User not found'), 'GET /api/profile')
    return NextResponse.json({ user })
  } catch (error) {
    return errorResponse(error, 'GET /api/profile')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth()
    const id = Number(session.sub)
    const current = await getUserWithHashById(id)
    if (!current) return errorResponse(new Error('User not found'), 'PUT /api/profile')

    const { name, email, currentPassword, newPassword } = await request.json()

    const emailStr = email !== undefined ? String(email).trim() : undefined
    if (emailStr !== undefined) {
      if (!emailStr) return errorResponse(new Error('Email cannot be empty'), 'PUT /api/profile')
      if (await emailExists(emailStr, id)) {
        return errorResponse(new Error('That email is already in use'), 'PUT /api/profile')
      }
    }

    // Password change requires the current password.
    if (newPassword) {
      if (String(newPassword).length < 8) {
        return errorResponse(new Error('New password must be at least 8 characters'), 'PUT /api/profile')
      }
      const ok = await verifyPassword(String(currentPassword || ''), current.password_hash)
      if (!ok) {
        return errorResponse(new Error('Current password is incorrect'), 'PUT /api/profile')
      }
      await updatePassword(id, String(newPassword))
    }

    if (name !== undefined || emailStr !== undefined) {
      await updateUser(id, {
        name: name !== undefined ? String(name) : undefined,
        email: emailStr,
      })
    }

    // Re-read a clean (hash-free) user for the session + response.
    const updated = await getUserById(id)
    if (updated) {
      // Re-issue the session so the cookie reflects the new name/email.
      await createSession({
        id: updated.id,
        email: updated.email,
        role: updated.role,
        name: updated.name,
      })
    }

    return NextResponse.json({ success: true, user: updated })
  } catch (error) {
    return errorResponse(error, 'PUT /api/profile')
  }
}
