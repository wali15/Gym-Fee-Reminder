import { NextRequest, NextResponse } from 'next/server'
import { getMembers, createMember, markMemberPaid, MemberInput } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { errorResponse } from '@/lib/api'
import { isValidEmail, isValidPhoneNumber, isPositiveNumber, isValidDate } from '@/lib/validation'

// Auth/DB-backed: always run per-request (reads the session cookie).
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAuth()
    const members = await getMembers()
    return NextResponse.json({ members })
  } catch (error) {
    return errorResponse(error, 'GET /api/members')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth() // Get session for audit logging

    const body = await request.json()
    const { name, email, phone, fee_amount, due_date, status } = body

    // Validate required fields
    if (!name || !fee_amount || !due_date) {
      return NextResponse.json(
        { error: 'Missing required fields: name, fee_amount, due_date' },
        { status: 400 }
      )
    }

    // Validate name
    if (typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate email if provided
    if (email !== undefined && email !== null && email !== '' && !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate phone if provided
    if (phone !== undefined && phone !== null && phone !== '' && !isValidPhoneNumber(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Validate fee_amount
    if (!isPositiveNumber(fee_amount)) {
      return NextResponse.json(
        { error: 'Fee amount must be a positive number' },
        { status: 400 }
      )
    }

    // Validate due_date
    if (!isValidDate(due_date)) {
      return NextResponse.json(
        { error: 'Due date must be a valid date in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    const data: MemberInput = {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      fee_amount: Number(fee_amount),
      due_date,
      status: status || 'due',
    }

    const member = await createMember(data, session.email)
    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'POST /api/members')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth() // Get session for audit logging
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action')

    if (!id) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      )
    }

    const memberId = parseInt(id, 10)
    if (isNaN(memberId)) {
      return NextResponse.json(
        { error: 'Invalid member ID' },
        { status: 400 }
      )
    }

    if (action === 'paid') {
      const member = await markMemberPaid(memberId, session.email)
      if (!member) {
        return NextResponse.json(
          { error: 'Member not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ member })
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error) {
    return errorResponse(error, 'PATCH /api/members')
  }
}