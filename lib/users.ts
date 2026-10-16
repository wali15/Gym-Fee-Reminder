import { getClient, ensureSchema } from './db'
import { hashPassword, type Role } from './auth'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  google_id?: string | null
  created_at: string
  updated_at: string
}

export interface UserWithHash extends User {
  password_hash: string
  google_id?: string | null
}

function mapUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role === 'admin' ? 'admin' : 'standard',
    google_id: row.google_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function normalizeRole(role: unknown): Role {
  return role === 'admin' ? 'admin' : 'standard'
}

export async function getUserByEmail(email: string): Promise<UserWithHash | null> {
  await ensureSchema()
  const client = getClient()
  const res = await client.execute({
    sql: 'SELECT * FROM users WHERE email = ? COLLATE NOCASE',
    args: [email],
  })
  const row = res.rows[0]
  if (!row) return null
  return {
    ...mapUser(row),
    password_hash: row.password_hash,
    google_id: row.google_id ?? null,
  }
}

export async function getUserById(id: number): Promise<User | null> {
  await ensureSchema()
  const client = getClient()
  const res = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] })
  return res.rows[0] ? mapUser(res.rows[0]) : null
}

export async function getUserWithHashById(id: number): Promise<UserWithHash | null> {
  await ensureSchema()
  const client = getClient()
  const res = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] })
  const row = res.rows[0]
  if (!row) return null
  return {
    ...mapUser(row),
    password_hash: row.password_hash,
    google_id: row.google_id ?? null,
  }
}

export async function listUsers(): Promise<User[]> {
  await ensureSchema()
  const client = getClient()
  const res = await client.execute('SELECT * FROM users ORDER BY created_at ASC')
  return res.rows.map(mapUser)
}

export async function countUsers(): Promise<number> {
  await ensureSchema()
  const client = getClient()
  const res = await client.execute('SELECT COUNT(*) AS c FROM users')
  return Number(res.rows[0]?.c ?? 0)
}

export async function countAdmins(): Promise<number> {
  await ensureSchema()
  const client = getClient()
  const res = await client.execute(`SELECT COUNT(*) AS c FROM users WHERE role = 'admin'`)
  return Number(res.rows[0]?.c ?? 0)
}

/** Case-insensitive email existence check, optionally excluding one user id. */
export async function emailExists(email: string, exceptId?: number): Promise<boolean> {
  await ensureSchema()
  const client = getClient()
  const res = await client.execute({
    sql: 'SELECT id FROM users WHERE email = ? COLLATE NOCASE',
    args: [email],
  })
  return res.rows.some((r) => exceptId === undefined || Number(r.id) !== exceptId)
}

export async function createUser(input: {
  name: string
  email: string
  password: string
  role?: Role
}): Promise<User> {
  await ensureSchema()
  const client = getClient()
  const password_hash = await hashPassword(input.password)
  const res = await client.execute({
    sql: `INSERT INTO users (name, email, password_hash, role)
          VALUES (?, ?, ?, ?) RETURNING *`,
    args: [input.name.trim(), input.email.trim(), password_hash, normalizeRole(input.role)],
  })
  return mapUser(res.rows[0])
}

export async function updateUser(
  id: number,
  data: { name?: string; email?: string; role?: Role }
): Promise<User | null> {
  await ensureSchema()
  const client = getClient()
  const fields: string[] = []
  const args: (string | number)[] = []

  if (data.name !== undefined) {
    fields.push('name = ?')
    args.push(data.name.trim())
  }
  if (data.email !== undefined) {
    fields.push('email = ?')
    args.push(data.email.trim())
  }
  if (data.role !== undefined) {
    fields.push('role = ?')
    args.push(normalizeRole(data.role))
  }

  if (fields.length === 0) return getUserById(id)

  fields.push(`updated_at = datetime('now')`)
  args.push(id)

  const res = await client.execute({
    sql: `UPDATE users SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
    args,
  })
  return res.rows[0] ? mapUser(res.rows[0]) : null
}

export async function updatePassword(id: number, newPassword: string): Promise<void> {
  await ensureSchema()
  const client = getClient()
  const password_hash = await hashPassword(newPassword)
  await client.execute({
    sql: `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [password_hash, id],
  })
}

export async function deleteUser(id: number): Promise<boolean> {
  await ensureSchema()
  const client = getClient()
  const res = await client.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] })
  return res.rowsAffected > 0
}
