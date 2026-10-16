import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { host, port, username, password, secure } = await request.json()

    // Basic validation
    if (!host || !port || !username || !password) {
      return NextResponse.json(
        { error: 'Host, port, username, and password are required' },
        { status: 400 }
      )
    }

    // Validate port is a number
    const portNum = Number(port)
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return NextResponse.json(
        { error: 'Port must be a valid port number (1-65535)' },
        { status: 400 }
      )
    }

    // Test SMTP connection using a simple TCP connection
    // We'll use the built-in net module to test the connection
    const { createConnection } = await import('net')

    return new Promise<NextResponse>((resolve) => {
      const connection = createConnection({
        host: host,
        port: portNum,
      })

      let connected = false
      let timedOut = false

      // Timeout after 10 seconds
      const timeoutId = setTimeout(() => {
        timedOut = true
        connection.destroy()
        resolve(NextResponse.json(
          { error: 'Connection timeout - unable to reach SMTP server' },
          { status: 408 }
        ))
      }, 10000)

      connection.on('connect', () => {
        connected = true
        clearTimeout(timeoutId)
        connection.end()
        resolve(NextResponse.json({ success: true }))
      })

      connection.on('error', (err) => {
        if (!timedOut) {
          clearTimeout(timeoutId)
          connection.destroy()
          resolve(NextResponse.json(
            { error: `Connection failed: ${err.message}` },
            { status: 400 }
          ))
        }
      })

      connection.on('timeout', () => {
        if (!timedOut) {
          timedOut = true
          connection.destroy()
          resolve(NextResponse.json(
            { error: 'Connection timeout' },
            { status: 408 }
          ))
        }
      })
    })
  } catch (error) {
    console.error('SMTP test error:', error)
    return errorResponse(error, 'POST /api/settings/test-smtp')
  }
}