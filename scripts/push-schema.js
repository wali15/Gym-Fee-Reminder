// OPTIONAL helper — you normally never need this.
//
// The app self-initializes its schema at runtime (lib/db.ts `ensureSchema()`
// runs the same CREATE TABLE IF NOT EXISTS statements on first use), so a fresh
// Turso database is set up automatically the first time the app talks to it.
//
// This script exists only if you want to push the schema to Turso manually
// (e.g. to inspect the DB before first deploy). It loads env the same way
// Next.js does, then applies schema.sql. Run with: npm run db:push
//
// Note: it's plain CommonJS so `node scripts/push-schema.js` works directly.

const fs = require('fs')
const path = require('path')
const { createClient } = require('@libsql/client')

// Load .env / .env.local exactly like Next.js does, if @next/env is available.
try {
  const { loadEnvConfig } = require('@next/env')
  loadEnvConfig(process.cwd())
} catch {
  // @next/env not resolvable — fall back to whatever is already in the shell env.
}

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url) {
  console.error('TURSO_DATABASE_URL is not set. Add it to .env.local or your shell environment.')
  process.exit(1)
}

const client = createClient({ url, authToken })

async function pushSchema() {
  const schemaPath = path.join(__dirname, '..', 'schema.sql')
  console.log('Reading schema.sql...')
  const raw = fs.readFileSync(schemaPath, 'utf-8')

  // Strip full-line comments, then split into statements on ';'.
  const statements = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  console.log(`Executing ${statements.length} statements...`)
  for (const stmt of statements) {
    try {
      await client.execute(stmt)
      console.log(`✓ ${stmt.substring(0, 50).replace(/\s+/g, ' ')}...`)
    } catch (error) {
      console.error(`✗ ${stmt.substring(0, 50).replace(/\s+/g, ' ')}...`)
      console.error(error)
    }
  }

  console.log('Schema push complete!')
  process.exit(0)
}

pushSchema().catch((err) => {
  console.error(err)
  process.exit(1)
})
