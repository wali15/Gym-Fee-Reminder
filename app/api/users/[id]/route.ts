import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import {
  countAdmins,
  deleteUser,
  emailExists,
  getUserById,
  updatePassword,
  updateUser,
} from '@/lib/users'
import { errorResponse } from '@/lib/api'

// Auth/DB-backed: always run per-request (reads the session cookie).
export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const userId = Number(id)

    const target = await getUserById(userId)
    if (!target) return errorResponse(new Error('User not found'), 'PUT /api/users/[id]')

    const { name, email, role } = await request.json()

    const emailStr = email !== undefined ? String(email).trim() : undefined
    if (emailStr !== undefined) {
      if (!emailStr) return errorResponse(new Error('Email cannot be empty'), 'PUT /api/users/[id]')
      if (await emailExists(emailStr, userId)) {
        return errorResponse(new Error('That email is already in use'), 'PUT /api/users/[id]')
      }
    }

    // Guard: don't demote the last remaining admin.
    if (role !== undefined && role !== 'admin' && target.role === 'admin') {
      if ((await countAdmins()) <= 1) {
        return errorResponse(new Error('Cannot demote the last admin'), 'PUT /api/users/[id]')
      }
    }

    const updated = await updateUser(userId, {
      name: name !== undefined ? String(name) : undefined,
      email: emailStr,
      role: role !== undefined ? (role === 'admin' ? 'admin' : 'standard') : undefined,
    })
    return NextResponse.json({ user: updated })
  } catch (error) {
    return errorResponse(error, 'PUT /api/users/[id]')
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const userId = Number(id)

    const target = await getUserById(userId)
    if (!target) return errorResponse(new Error('User not found'), 'PATCH /api/users/[id]')

    const body = await request.json()
    if (body.action === 'reset-password') {
      if (!body.password || String(body.password).length < 8) {
        return errorResponse(new Error('Password must be at least 8 characters'), 'PATCH /api/users/[id]')
      }
      await updatePassword(userId, String(body.password))
      return NextResponse.json({ success: true })
    }

    return errorResponse(new Error('Invalid action'), 'PATCH /api/users/[id]')
  } catch (error) {
    return errorResponse(error, 'PATCH /api/users/[id]')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params
    const userId = Number(id)

    if (Number(session.sub) === userId) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    const target = await getUserById(userId)
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Guard: never remove the last admin.
    if (target.role === 'admin' && (await countAdmins()) <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last admin' }, { status: 400 })
    }

    await deleteUser(userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, 'DELETE /api/users/[id]')
  }
}
