import { createClient, type Client } from '@libsql/client'
import { SCHEMA_STATEMENTS } from './schema'
import { logMemberChange } from './audit'

/** Thrown when Turso credentials are absent in production (onboarding grace). */
export class DbNotConfiguredError extends Error {
  constructor() {
    super('Database not configured')
    this.name = 'DbNotConfiguredError'
  }
}

type Row = Record<string, any>
export interface DbClient {
  execute(query: string | { sql: string; args?: any[] }): Promise<{
    rows: Row[]
    rowsAffected: number
    lastInsertRowid?: number | bigint
  }>
}

function getClient(): DbClient {
  const isLocal = process.env.NODE_ENV === 'development' && !process.env.TURSO_DATABASE_URL

  if (isLocal) {
    // Local dev: file-backed SQLite via better-sqlite3. `new Database(path)`
    // creates the file if missing, so a deleted local.db self-heals on first use.
    const Database = require('better-sqlite3')
    const path = require('path')
    const dbPath = path.join(process.cwd(), 'local.db')
    const db = new Database(dbPath)

    return {
      async execute(query) {
        const sql = typeof query === 'string' ? query : query.sql
        const args = typeof query === 'string' ? [] : query.args || []
        const upper = sql.trim().toUpperCase()
        // Statements that yield rows: SELECT/PRAGMA and anything with RETURNING.
        const returnsRows =
          upper.startsWith('SELECT') || upper.startsWith('PRAGMA') || / RETURNING /i.test(sql)
        const stmt = db.prepare(sql)
        if (returnsRows) {
          return { rows: stmt.all(...args) as Row[], rowsAffected: 0 }
        }
        const result = stmt.run(...args)
        return {
          rows: [],
          rowsAffected: result.changes,
          lastInsertRowid: result.lastInsertRowid,
        }
      },
    }
  }

  if (!process.env.TURSO_DATABASE_URL) {
    // Production without credentials: surface a typed error so API routes can
    // answer 503 and the UI can show "waiting for database configuration".
    throw new DbNotConfiguredError()
  }

  return createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  }) as unknown as Client & DbClient
}

// ---- Zero-touch schema initialization ---------------------------------------

let schemaReady: Promise<void> | null = null

/**
 * Create all tables (idempotent) once per process, then optionally seed the
 * first admin from env. Memoized; on failure the memo is cleared so a transient
 * DB outage doesn't permanently poison the cache.
 */
async function migrateUsersTable(client: DbClient): Promise<void> {
  // Check if google_id column exists in users table
  const tableInfo = await client.execute({ sql: "PRAGMA table_info(users)" })
  const columns = tableInfo.rows.map((row: any) => row.name)
  if (!columns.includes('google_id')) {
    // Add the column
    await client.execute({ sql: "ALTER TABLE users ADD COLUMN google_id TEXT" })
  }
}

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = getClient()
      for (const stmt of SCHEMA_STATEMENTS) {
        await client.execute(stmt)
      }
      // Run migrations
      await migrateUsersTable(client)
      await maybeSeedAdminFromEnv(client)
    })().catch((err) => {
      schemaReady = null
      throw err
    })
  }
  return schemaReady
}

/**
 * Convenience zero-touch path: if ADMIN_EMAIL + ADMIN_PASSWORD_HASH are set and
 * no users exist yet, seed that admin. (ADMIN_PASSWORD_HASH is already a bcrypt
 * hash, so it's stored verbatim.) When these aren't set, the first-run UI at
 * /login handles admin creation instead.
 */
async function maybeSeedAdminFromEnv(client: DbClient): Promise<void> {
  const email = process.env.ADMIN_EMAIL
  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!email || !hash) return

  const countRes = await client.execute('SELECT COUNT(*) AS c FROM users')
  const count = Number(countRes.rows[0]?.c ?? 0)
  if (count > 0) return

  await client.execute({
    sql: `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')`,
    args: ['Admin', email, hash],
  })
}

// ---- Settings accessors -----------------------------------------------------

export async function getSettingsRows(): Promise<{ key: string; value: string | null }[]> {
  await ensureSchema()
  const client = getClient()
  const res = await client.execute('SELECT key, value FROM settings')
  return res.rows.map((r) => ({ key: r.key, value: r.value ?? null }))
}

export async function upsertSettings(entries: Record<string, string>): Promise<void> {
  await ensureSchema()
  const client = getClient()
  for (const [key, value] of Object.entries(entries)) {
    await client.execute({
      sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      args: [key, value],
    })
  }
}

export async function getSettingRaw(key: string): Promise<string | null> {
  await ensureSchema()
  const client = getClient()
  const res = await client.execute({
    sql: 'SELECT value FROM settings WHERE key = ?',
    args: [key],
  })
  return res.rows[0] ? res.rows[0].value ?? null : null
}

export async function setSettingRaw(key: string, value: string): Promise<void> {
  await upsertSettings({ [key]: value })
}

// Re-export the raw client factory for modules that manage their own tables
// (e.g. lib/users.ts). Everything funnels through ensureSchema() first.
export { getClient }

// ---- Member model + queries -------------------------------------------------

export type Member = {
  id: number
  name: string
  email: string | null
  phone: string | null
  fee_amount: number
  due_date: string
  status: 'paid' | 'due' | 'overdue'
  last_reminder_sent: string | null
  created_at: string
  updated_at: string
}

export type MemberInput = {
  name: string
  email?: string | null
  phone?: string | null
  fee_amount: number
  due_date: string
  status?: 'paid' | 'due' | 'overdue'
}

function mapRow(row: any): Member {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    fee_amount: row.fee_amount,
    due_date: row.due_date,
    status: row.status,
    last_reminder_sent: row.last_reminder_sent,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function getMembers(): Promise<Member[]> {
  await ensureSchema()
  const client = getClient()
  const result = await client.execute('SELECT * FROM members ORDER BY due_date ASC')
  return result.rows.map(mapRow)
}

export async function getMember(id: number): Promise<Member | null> {
  await ensureSchema()
  const client = getClient()
  const result = await client.execute({
    sql: 'SELECT * FROM members WHERE id = ?',
    args: [id],
  })
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function createMember(data: MemberInput, changedByEmail?: string): Promise<Member> {
  await ensureSchema()
  const client = getClient()
  const result = await client.execute({
    sql: `
      INSERT INTO members (name, email, phone, fee_amount, due_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `,
    args: [
      data.name,
      data.email || null,
      data.phone || null,
      data.fee_amount,
      data.due_date,
      data.status || 'due',
    ],
  })

  const createdMember = mapRow(result.rows[0])

  // Log audit entry if changedByEmail is provided
  if (changedByEmail) {
    await logMemberChange(
      createdMember.id,
      'CREATE',
      null, // No old value for CREATE
      createdMember,
      changedByEmail
    )
  }

  return createdMember
}

export async function updateMember(id: number, data: Partial<MemberInput>, changedByEmail?: string): Promise<Member | null> {
  await ensureSchema()
  const client = getClient()

  // Get the current member for audit logging
  const oldMember = await getMember(id)
  if (!oldMember) return null

  const fields: string[] = []
  const args: (string | number | null)[] = []

  if (data.name !== undefined) {
    fields.push('name = ?')
    args.push(data.name)
  }
  if (data.email !== undefined) {
    fields.push('email = ?')
    args.push(data.email)
  }
  if (data.phone !== undefined) {
    fields.push('phone = ?')
    args.push(data.phone)
  }
  if (data.fee_amount !== undefined) {
    fields.push('fee_amount = ?')
    args.push(data.fee_amount)
  }
  if (data.due_date !== undefined) {
    fields.push('due_date = ?')
    args.push(data.due_date)
  }
  if (data.status !== undefined) {
    fields.push('status = ?')
    args.push(data.status)
  }

  if (fields.length === 0) return getMember(id)

  fields.push(`updated_at = datetime('now')`)
  args.push(id)

  const result = await client.execute({
    sql: `UPDATE members SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
    args,
  })

  const updatedMember = result.rows[0] ? mapRow(result.rows[0]) : null

  // Log audit entry if changedByEmail is provided
  if (changedByEmail && updatedMember) {
    await logMemberChange(
      id,
      'UPDATE',
      oldMember,
      updatedMember,
      changedByEmail
    )
  }

  return updatedMember
}

export async function deleteMember(id: number, changedByEmail?: string): Promise<boolean> {
  await ensureSchema()
  const client = getClient()

  // Get the member for audit logging before deleting
  const oldMember = await getMember(id)

  const result = await client.execute({
    sql: 'DELETE FROM members WHERE id = ?',
    args: [id],
  })

  const deleted = result.rowsAffected > 0

  // Log audit entry if changedByEmail is provided
  if (changedByEmail && deleted && oldMember) {
    await logMemberChange(
      id,
      'DELETE',
      oldMember,
      null, // No new value for DELETE
      changedByEmail
    )
  }

  return deleted
}

export async function markMemberPaid(id: number, changedByEmail?: string): Promise<Member | null> {
  await ensureSchema()
  const client = getClient()

  // Get the current member for audit logging
  const oldMember = await getMember(id)

  const result = await client.execute({
    sql: `UPDATE members SET status = 'paid', updated_at = datetime('now') WHERE id = ? RETURNING *`,
    args: [id],
  })

  const updatedMember = result.rows[0] ? mapRow(result.rows[0]) : null

  // Log audit entry if changedByEmail is provided
  if (changedByEmail && updatedMember) {
    await logMemberChange(
      id,
      'UPDATE',
      oldMember,
      updatedMember,
      changedByEmail
    )
  }

  return updatedMember
}

export async function updateMemberReminderSent(id: number): Promise<void> {
  await ensureSchema()
  const client = getClient()
  await client.execute({
    sql: `UPDATE members SET last_reminder_sent = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    args: [id],
  })
}

export async function getDueMembers(): Promise<Member[]> {
  await ensureSchema()
  const client = getClient()
  const today = new Date().toISOString().split('T')[0]
  const result = await client.execute({
    sql: `SELECT * FROM members
          WHERE status IN ('due', 'overdue')
          AND due_date <= ?
          ORDER BY due_date ASC`,
    args: [today],
  })
  return result.rows.map(mapRow)
}

export async function getOverdueMembers(): Promise<Member[]> {
  await ensureSchema()
  const client = getClient()
  const today = new Date().toISOString().split('T')[0]
  const result = await client.execute({
    sql: `SELECT * FROM members
          WHERE status = 'due'
          AND due_date < ?
          ORDER BY due_date ASC`,
    args: [today],
  })
  return result.rows.map(mapRow)
}

export async function updateOverdueStatus(): Promise<number> {
  await ensureSchema()
  const client = getClient()
  const today = new Date().toISOString().split('T')[0]
  const result = await client.execute({
    sql: `UPDATE members
          SET status = 'overdue', updated_at = datetime('now')
          WHERE status = 'due' AND due_date < ?`,
    args: [today],
  })
  return result.rowsAffected
}

export async function getMemberByEmail(email: string): Promise<Member | null> {
  await ensureSchema()
  const client = getClient()
  const result = await client.execute({
    sql: 'SELECT * FROM members WHERE email = ?',
    args: [email],
  })
  return result.rows[0] ? mapRow(result.rows[0]) : null
}
