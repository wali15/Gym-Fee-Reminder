import type { Config } from '@netlify/functions'
import { createClient } from '@libsql/client'
import { SCHEMA_STATEMENTS } from '../../lib/schema'
import {
  parseSettings,
  toEmailConfig,
  toReminderConfig,
  toWhatsAppConfig,
  hourInTz,
  todayInTz,
} from '../../lib/settings'
import { sendReminderEmail } from '../../lib/email'
import { sendWhatsAppReminder } from '../../lib/whatsapp'

type Member = {
  id: number
  name: string
  email: string | null
  phone: string | null
  fee_amount: number
  due_date: string
  status: 'paid' | 'due' | 'overdue'
  last_reminder_sent: string | null
}

/** Date string (YYYY-MM-DD) N days after the given YYYY-MM-DD, date-only math. */
function addDays(dateStr: string, days: number): string {
  const base = new Date(`${dateStr}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().split('T')[0]
}

/** The date portion (in tz) of a SQLite `datetime('now')` UTC timestamp. */
function reminderDate(tz: string, stored: string): string {
  return todayInTz(tz, new Date(`${stored.replace(' ', 'T')}Z`))
}

export default async function handler() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.log('check-due: TURSO_DATABASE_URL not set — skipping (awaiting DB config)')
    return json({ success: true, skipped: 'db-not-configured' })
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  try {
    // Zero-touch: make sure the tables exist before touching them.
    for (const stmt of SCHEMA_STATEMENTS) {
      await client.execute(stmt)
    }

    const settingsRes = await client.execute('SELECT key, value FROM settings')
    const settings = parseSettings(
      settingsRes.rows.map((r: any) => ({ key: r.key, value: r.value ?? null }))
    )
    const reminder = toReminderConfig(settings)

    // Reminder time gate: only proceed during the configured hour, in the
    // configured timezone. Runs hourly (see schedule below), no-ops otherwise.
    if (!reminder.enabled) {
      console.log('check-due: reminders disabled — no-op')
      return json({ success: true, skipped: 'reminders-disabled' })
    }
    const currentHour = hourInTz(reminder.timezone)
    if (currentHour !== reminder.hour) {
      console.log(
        `check-due: current hour ${currentHour} (${reminder.timezone}) != reminder hour ${reminder.hour} — no-op`
      )
      return json({ success: true, skipped: 'off-hour', currentHour, reminderHour: reminder.hour })
    }

    const emailConfig = toEmailConfig(settings)
    const whatsappConfig = toWhatsAppConfig(settings)

    const today = todayInTz(reminder.timezone)
    const threshold = addDays(today, reminder.daysBefore)

    const overdueResult = await client.execute({
      sql: `UPDATE members
            SET status = 'overdue', updated_at = datetime('now')
            WHERE status = 'due' AND due_date < ?`,
      args: [today],
    })
    console.log(`Updated ${overdueResult.rowsAffected} members to overdue`)

    const dueSoonResult = await client.execute({
      sql: `SELECT * FROM members
            WHERE status IN ('due', 'overdue')
            AND due_date <= ?
            ORDER BY due_date ASC`,
      args: [threshold],
    })

    const members = dueSoonResult.rows as unknown as Member[]
    console.log(`Found ${members.length} members due or overdue`)

    let remindersSent = 0
    let emailsSent = 0
    let whatsappsSent = 0
    const errors: string[] = []

    for (const member of members) {
      try {
        const alreadyToday =
          member.last_reminder_sent &&
          reminderDate(reminder.timezone, member.last_reminder_sent) === today
        if (alreadyToday) {
          console.log(`Skipping ${member.name} - reminder already sent today`)
          continue
        }

        let emailResult = { success: false, error: 'No email' } as { success: boolean; error?: string }
        let whatsappResult = { success: false, error: 'No phone' } as { success: boolean; error?: string }

        if (member.email) {
          emailResult = await sendReminderEmail(
            {
              name: member.name,
              email: member.email,
              feeAmount: member.fee_amount,
              dueDate: member.due_date,
              status: member.status,
            },
            emailConfig
          )
          if (emailResult.success) emailsSent++
        }

        if (member.phone) {
          whatsappResult = await sendWhatsAppReminder(
            {
              name: member.name,
              phone: member.phone,
              feeAmount: member.fee_amount,
              dueDate: member.due_date,
              status: member.status,
            },
            whatsappConfig
          )
          if (whatsappResult.success) whatsappsSent++
        }

        if (emailResult.success || whatsappResult.success) {
          await client.execute({
            sql: `UPDATE members SET last_reminder_sent = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
            args: [member.id],
          })
          remindersSent++
        } else {
          errors.push(`${member.name}: ${emailResult.error}, ${whatsappResult.error}`)
        }
      } catch (memberError) {
        console.error(`Error processing member ${member.id}:`, memberError)
        errors.push(
          `${member.name}: ${memberError instanceof Error ? memberError.message : 'Unknown error'}`
        )
      }
    }

    console.log(
      `Daily check complete: ${remindersSent} reminders sent (${emailsSent} emails, ${whatsappsSent} WhatsApp)`
    )
    if (errors.length > 0) console.warn('Errors:', errors)

    return json({
      success: true,
      remindersSent,
      emailsSent,
      whatsappsSent,
      overdueUpdated: overdueResult.rowsAffected,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Daily check failed:', error)
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Runs hourly; the handler no-ops unless the current hour (in the configured
// timezone) matches the admin's chosen reminder hour. This is what makes the
// in-app "reminder time" setting actually take effect.
export const config: Config = {
  schedule: '0 * * * *',
}
