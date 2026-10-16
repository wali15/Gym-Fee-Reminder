import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { errorResponse } from '@/lib/api'
import { getMemberByEmail, updateMember } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    
    // Get member by email from session
    const member = await getMemberByEmail(session.email)
    
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      user: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
      }
    })
  } catch (error) {
    return errorResponse(error, 'GET /api/profile')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth()
    const jsonData = await request.json()
    const { name, email } = jsonData
    
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }
    
    // Update member
    const updatedMember = await updateMember(session.email, { name, email })
    
    if (!updatedMember) {
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }
    
    return NextResponse.json({
      user: {
        id: updatedMember.id,
        name: updatedMember.name,
        email: updatedMember.email,
        role: updatedMember.role,
      }
    })
  } catch (error) {
    return errorResponse(error, 'PUT /api/profile')
  }
}
