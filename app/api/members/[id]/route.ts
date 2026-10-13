import { NextRequest, NextResponse } from 'next/server'
import { getMember, updateMember, deleteMember, markMemberPaid } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { errorResponse } from '@/lib/api'
import { isValidEmail, isValidPhoneNumber, isPositiveNumber, isValidDate } from '@/lib/validation'

// Auth/DB-backed: always run per-request (reads the session cookie).
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const member = await getMember(Number(id))

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json({ member })
  } catch (error) {
    return errorResponse(error, 'GET /api/members/[id]')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth() // Get session for audit logging
    const { id } = await params
    const body = await request.json()

    // Validate input data
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
      return NextResponse.json(
        { error: 'Name must be a non-empty string' },
        { status: 400 }
      )
    }

    if (body.email !== undefined && body.email !== null && body.email !== '' && !isValidEmail(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (body.phone !== undefined && body.phone !== null && body.phone !== '' && !isValidPhoneNumber(body.phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    if (body.fee_amount !== undefined && !isPositiveNumber(body.fee_amount)) {
      return NextResponse.json(
        { error: 'Fee amount must be a positive number' },
        { status: 400 }
      )
    }

    if (body.due_date !== undefined && !isValidDate(body.due_date)) {
      return NextResponse.json(
        { error: 'Due date must be a valid date in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (body.status !== undefined && !['paid', 'due', 'overdue'].includes(body.status)) {
      return NextResponse.json(
        { error: "Status must be one of: 'paid', 'due', 'overdue'" },
        { status: 400 }
      )
    }

    const member = await updateMember(Number(id), body, session.email)

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json({ member })
  } catch (error) {
    return errorResponse(error, 'PUT /api/members/[id]')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Deleting members is an admin-only capability.
    const session = await requireAdmin() // Get session for audit logging
    const { id } = await params

    const deleted = await deleteMember(Number(id), session.email)

    if (!deleted) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, 'DELETE /api/members/[id]')
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth() // Get session for audit logging
    const { id } = await params
    const body = await request.json()

    if (body.action === 'mark-paid') {
      const member = await markMemberPaid(Number(id), session.email)

      if (!member) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
      }

      return NextResponse.json({ member })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return errorResponse(error, 'PATCH /api/members/[id]')
  }
}