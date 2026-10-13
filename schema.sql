-- Gym Fee Reminder — database schema
--
-- You normally DO NOT need to run this. The app creates these tables
-- automatically on first use (see lib/schema.ts / lib/db.ts `ensureSchema()`),
-- so a fresh Turso database is initialized for you. This file is kept only for
-- reference and for the optional `npm run db:push` helper.
--
-- Keep this in sync with lib/schema.ts (SCHEMA_STATEMENTS), the source of truth.

CREATE TABLE IF NOT EXISTS members (
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
);

CREATE INDEX IF NOT EXISTS idx_members_due_date ON members(due_date);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);

-- Application users with role-based access (admin | standard).
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'standard',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Runtime-editable configuration (gym branding, reminder time, email/WhatsApp
-- config) plus the auto-generated session secret.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
