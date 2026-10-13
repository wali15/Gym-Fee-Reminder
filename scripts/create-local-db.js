const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')

// Local-development convenience only. In production (and on first real run) the
// app self-initializes its schema via lib/db.ts `ensureSchema()` and you create
// the first admin through the /login setup screen — no scripts required.
//
// This script gives you a ready-to-use local.db with sample members and a dev
// admin so you can start `next dev` and log in immediately. The table DDL below
// mirrors lib/schema.ts (SCHEMA_STATEMENTS); keep them in sync.

const dbPath = path.join(__dirname, '..', 'local.db')

// Use a specific password for the dev admin (change this for your deployment)
// WARNING: This password is known and should only be used for local development!
const DEV_ADMIN_EMAIL = 'admin@example.com'
const DEV_ADMIN_PASSWORD = 'Password@110!'

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath)
}

const db = new Database(dbPath)

console.log('Creating local SQLite database...')

db.exec(`
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

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

// Seed a dev admin so you can log in right away.
const passwordHash = bcrypt.hashSync(DEV_ADMIN_PASSWORD, 12)
db.prepare(
  `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')`
).run('Dev Admin', DEV_ADMIN_EMAIL, passwordHash)

// Insert sample members.
const today = new Date()
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)
const threeDaysAgo = new Date(today)
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
const nextWeek = new Date(today)
nextWeek.setDate(nextWeek.getDate() + 7)

const fmt = (d) => d.toISOString().split('T')[0]

const stmt = db.prepare(`
  INSERT INTO members (name, email, phone, fee_amount, due_date, status, last_reminder_sent)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const sampleMembers = [
  ['Rajesh Kumar', 'rajesh@email.com', '9876543210', 1500, fmt(tomorrow), 'due', null],
  ['Priya Sharma', 'priya@email.com', '9876543211', 2000, fmt(yesterday), 'overdue', fmt(threeDaysAgo)],
  ['Amit Patel', 'amit@email.com', '9876543212', 1800, fmt(nextWeek), 'due', null],
  ['Sneha Singh', 'sneha@email.com', '9876543213', 2500, fmt(today), 'due', null],
  ['Vikram Reddy', 'vikram@email.com', '9876543214', 3000, fmt(yesterday), 'paid', fmt(today)],
  ['Anita Desai', 'anita@email.com', '9876543215', 1200, fmt(tomorrow), 'due', null],
  ['Rohit Gupta', 'rohit@email.com', '9876543216', 2200, fmt(threeDaysAgo), 'overdue', fmt(yesterday)],
  ['Kavya Nair', 'kavya@email.com', 'kavya@email.com', '9876543217', 1700, fmt(nextWeek), 'paid', null],
]

for (const m of sampleMembers) {
  stmt.run(...m)
}

console.log(`✓ Created local.db with ${sampleMembers.length} sample members`)
console.log('✓ Seeded dev admin:')
console.log(`    email:    ${DEV_ADMIN_EMAIL}`)
console.log(`    password: ${DEV_ADMIN_PASSWORD}`)
console.log('  (local only — production uses the /login setup screen)')
console.log('')
console.log('  ⚠️  SECURITY NOTE: This password is set to "Password@110!" for local development only.')
console.log('     Never use these credentials in production or share them.')
console.log('     In production, create admin via the /login setup screen or use ADMIN_EMAIL/ADMIN_PASSWORD_HASH env vars.')

db.close()