import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { errorResponse } from '@/lib/api'

// Auth/DB-backed: always run per-request (reads the session cookie).
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const tableName = searchParams.get('table') // 'members' or 'settings'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let whereClause = ''
    const params: any[] = []

    if (tableName === 'members' || tableName === 'settings') {
      whereClause = 'WHERE table_name = ?'
      params.push(tableName)
    }

    const client = getClient()
    const result = await client.execute({
      sql: `
        SELECT * FROM audit_log
        ${whereClause}
        ORDER BY changed_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [...params, limit, offset]
    })

    // Parse JSON fields for easier consumption
    const auditLogs = result.rows.map((log: any) => ({
      ...log,
      old_value: log.old_value ? JSON.parse(log.old_value) : null,
      new_value: log.new_value ? JSON.parse(log.new_value) : null
    }))

    return NextResponse.json({ audit_logs: auditLogs })
  } catch (error) {
    return errorResponse(error, 'GET /api/audit')
  }
}