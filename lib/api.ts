import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from './auth'
import { DbNotConfiguredError } from './db'

/**
 * Map a thrown error to a JSON NextResponse with the right status:
 *  - AuthError          → its status (401 Unauthorized / 403 Forbidden)
 *  - DbNotConfiguredError → 503 with a machine-readable code the UI keys off
 *  - anything else      → 500 (logged)
 */
export function errorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof DbNotConfiguredError) {
    return NextResponse.json(
      { error: 'Waiting for database configuration', code: 'DB_NOT_CONFIGURED' },
      { status: 503 }
    )
  }
  console.error(`${context} error:`, error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

/**
 * Safely parse JSON from a request body, returning a 400 error if parsing fails.
 *
 * @param request - The NextRequest to parse JSON from
 * @returns Promise<{ data: unknown } | { error: NextResponse }>
 */
export async function safeJsonParse(request: NextRequest): Promise<{ data: unknown } | { error: NextResponse }> {
  try {
    const body = await request.json()
    return { data: body }
  } catch (err) {
    return {
      error: NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
  }
}