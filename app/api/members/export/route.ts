import { NextRequest, NextResponse } from 'next/server'
import { getMembers } from '@/lib/db'
import { formatCsv } from '@/lib/csv'
import { requireAuth } from '@/lib/auth'
import { errorResponse } from '@/lib/api'

// Auth/DB-backed: always run per-request (reads the session cookie).
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAuth()
    const members = await getMembers()

    // Convert members to CSV format
    const csvMembers = members.map(member => ({
      name: member.name,
      email: member.email ?? '',
      phone: member.phone ?? '',
      fee_amount: member.fee_amount,
      due_date: member.due_date,
      status: member.status
    }))

    const csv = formatCsv(csvMembers)

    // Return CSV file
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="members.csv"'
      }
    })
  } catch (error) {
    return errorResponse(error, 'GET /api/members/export')
  }
}