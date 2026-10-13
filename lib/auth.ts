import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { getSettingRaw, setSettingRaw } from './db'

export const SESSION_COOKIE = 'admin_session'
const SESSION_DURATION = 7 * 24 * 60 * 60 // 7 days

export type Role = 'admin' | 'standard'

export interface SessionPayload {
  sub: string // user id as string
  email: string
  role: Role
  name: string
  exp?: number
  [key: string]: unknown
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

let cachedKey: Uint8Array | null = null

/**
 * Resolve the JWT signing key. Uses SESSION_SECRET when provided; otherwise
 * reads (or generates + persists) a random secret in the settings table. This
 * keeps the app zero-config: a stable secret exists without any env chore.
 */
export async function getSecretKey(): Promise<Uint8Array> {
  if (cachedKey) return cachedKey

  const envSecret = process.env.SESSION_SECRET
  if (envSecret && envSecret.length >= 16) {
    cachedKey = new TextEncoder().encode(envSecret)
    return cachedKey
  }

  let secret = await getSettingRaw('session_secret')
  if (!secret) {
    secret = randomBytes(48).toString('hex')
    await setSettingRaw('session_secret', secret)
  }
  cachedKey = new TextEncoder().encode(secret)
  return cachedKey
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false
  return bcrypt.compare(password, hash)
}

export async function createSession(user: {
  id: number | string
  email: string
  role: Role
  name: string
}): Promise<string> {
  const key = await getSecretKey()
  const token = await new SignJWT({ email: user.email, role: user.role, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(key)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  })

  return token
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const key = await getSecretKey()
    const { payload } = await jwtVerify(token, key)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) throw new AuthError('Unauthorized', 401)
  return session
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireAuth()
  if (session.role !== 'admin') throw new AuthError('Forbidden', 403)
  return session
}
