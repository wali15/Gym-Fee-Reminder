import { NextRequest, NextResponse } from 'next/server'
import { createMember } from '@/lib/db'
import { parseCsv } from '@/lib/csv'
import { requireAuth } from '@/lib/auth'
import { errorResponse } from '@/lib/api'

// Auth/DB-backed: always run per-request (reads the session cookie).
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth() // Get session for audit logging

    // Get the uploaded file
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Check if it's a CSV file
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      )
    }

    // Read the file content
    const csvContent = await file.text()

    // Parse CSV
    let csvMembers
    try {
      csvMembers = parseCsv(csvContent)
    } catch (parseError) {
      return NextResponse.json(
        { error: `Invalid CSV format: ${parseError.message}` },
        { status: 400 }
      )
    }

    // Import members
    const importedMembers = []
    const errors = []

    for (let i = 0; i < csvMembers.length; i++) {
      try {
        const memberData = {
          name: csvMembers[i].name,
          email: csvMembers[i].email || null,
          phone: csvMembers[i].phone || null,
          fee_amount: csvMembers[i].fee_amount,
          due_date: csvMembers[i].due_date,
          status: csvMembers[i].status || 'due'
        }

        const member = await createMember(memberData, session.email)
        importedMembers.push(member)
      } catch (memberError) {
        errors.push(`Row ${i + 2}: ${memberError.message}`) // +2 for header and 0-index
      }
    }

    // Return results
    return NextResponse.json({
      imported: importedMembers.length,
      errors,
      members: importedMembers
    }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'POST /api/members/import')
  }
}