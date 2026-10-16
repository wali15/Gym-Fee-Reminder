import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { errorResponse } from '@/lib/api'
import { getUserByEmail, updateUser } from '@/lib/users'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    
    // Get user by email from session
    const user = await getUserByEmail(session.email)
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
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

    const user = await getUserByEmail(session.email)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Update user profile
    const updatedUser = await updateUser(user.id, { name, email })
    
    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
    
    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      }
    })
  } catch (error) {
    return errorResponse(error, 'PUT /api/profile')
  }
}
