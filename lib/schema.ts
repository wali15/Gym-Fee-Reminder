// Single source of truth for the database schema.
//
// This module contains PURE strings only — no driver import — so it is safe to
// bundle into both the Next.js app and the standalone Netlify function without
// dragging in `better-sqlite3`/`@libsql/client`.
//
// Every statement is idempotent (`IF NOT EXISTS`), so it can run on every cold
// start to self-initialize a blank Turso (or local) database. This is what makes
// the project "zero-touch": the owner only pastes Turso credentials — the app
// creates its own tables. No manual SQL, ever.

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    fee_amount REAL NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'due',
    last_reminder_sent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_members_due_date ON members(due_date)`,
  `CREATE INDEX IF NOT EXISTS idx_members_status ON members(status)`,
  `CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone)`,

  // Application users with role-based access (admin | standard).
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'standard',
    google_id TEXT, -- Google OAuth ID (sub)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,

  // Runtime-editable configuration (gym branding, reminder time, email/WhatsApp
  // config) plus the auto-generated session secret. Key/value because the Netlify
  // runtime filesystem is read-only/ephemeral, so config cannot live in a file.
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // Audit log for tracking changes to settings and members
  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL, -- 'members' or 'settings'
    record_id TEXT, -- ID of the record that was changed (nullable for settings)
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    changed_by TEXT NOT NULL, -- email of the user who made the change
    changed_at TEXT NOT NULL DEFAULT (datetime('now')),
    old_value TEXT, -- JSON string of old value
    new_value TEXT  -- JSON string of new value
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at)`
]
