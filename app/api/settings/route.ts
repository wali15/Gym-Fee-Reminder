import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSettingsRows, upsertSettings, getSettingRaw } from '@/lib/db'
import {
  isValidTimezone,
  parseSettings,
  SECRET_SETTING_KEYS,
  serializeSettings,
  type Settings,
  type SettingKey,
} from '@/lib/settings'
import { errorResponse } from '@/lib/api'
import { isValidEmail, isValidPhoneNumber, isValidCurrency, isValidLanguageCode, isNonEmptyString } from '@/lib/validation'
import { logSettingsChange } from '@/lib/audit'

// Auth/DB-backed: always run per-request (reads the session cookie).
export const dynamic = 'force-dynamic'

function maskSecret(value: string): { set: boolean; last4: string } {
  return value ? { set: true, last4: value.slice(-4) } : { set: false, last4: '' }
}

/** Build the client-safe view: secrets blanked, with separate {set,last4} hints. */
function toClientView(settings: Settings) {
  const masked: Settings = { ...settings, resend_api_key: '', whatsapp_token: '' }
  return {
    settings: masked,
    secrets: {
      resend_api_key: maskSecret(settings.resend_api_key),
      whatsapp_token: maskSecret(settings.whatsapp_token),
    },
  }
}

export async function GET() {
  try {
    await requireAdmin()
    const settings = parseSettings(await getSettingsRows())
    return NextResponse.json(toClientView(settings))
  } catch (error) {
    return errorResponse(error, 'GET /api/settings')
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()
    const session = await requireAdmin() // Get the admin session for audit logging
    const body = (await request.json()) as Record<string, unknown>

    // Validate numeric/timezone fields when present.
    if (body.reminder_hour !== undefined) {
      if (!isValidHour(body.reminder_hour)) {
        return NextResponse.json({ error: 'reminder_hour must be an integer between 0 and 23' }, { status: 400 })
      }
    }
    if (body.reminder_days_before !== undefined) {
      if (!isValidDaysBefore(body.reminder_days_before)) {
        return NextResponse.json({ error: 'reminder_days_before must be an integer between 0 and 31' }, { status: 400 })
      }
    }
    if (body.timezone !== undefined && !isValidTimezone(String(body.timezone))) {
      return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })
    }
    if (body.currency !== undefined && body.currency !== null && body.currency !== '') {
      if (!isValidCurrency(String(body.currency))) {
        return NextResponse.json({ error: 'currency must be a valid 3-letter currency code (e.g., USD, EUR)' }, { status: 400 })
      }
    }
    if (body.email_from_address !== undefined && body.email_from_address !== null && body.email_from_address !== '') {
      if (!isValidEmail(String(body.email_from_address))) {
        return NextResponse.json({ error: 'Invalid from-address email format' }, { status: 400 })
      }
    }
    if (body.gym_contact_email !== undefined && body.gym_contact_email !== null && body.gym_contact_email !== '') {
      if (!isValidEmail(String(body.gym_contact_email))) {
        return NextResponse.json({ error: 'Invalid contact email format' }, { status: 400 })
      }
    }
    if (body.whatsapp_lang !== undefined && body.whatsapp_lang !== null && body.whatsapp_lang !== '') {
      if (!isValidLanguageCode(String(body.whatsapp_lang))) {
        return NextResponse.json({ error: 'whatsapp_lang must be a valid 2-letter language code (e.g., en, es)' }, { status: 400 })
      }
    }
    if (body.whatsapp_phone_id !== undefined && body.whatsapp_phone_id !== null && body.whatsapp_phone_id !== '') {
      if (!isValidPhoneNumber(String(body.whatsapp_phone_id))) {
        return NextResponse.json({ error: 'Invalid WhatsApp phone number format' }, { status: 400 })
      }
    }
    // Validate that template names are non-empty strings if provided
    if (body.whatsapp_template_due !== undefined && body.whatsapp_template_due !== null && body.whatsapp_template_due !== '') {
      if (!isNonEmptyString(body.whatsapp_template_due)) {
        return NextResponse.json({ error: 'whatsapp_template_due must be a non-empty string' }, { status: 400 })
      }
    }
    if (body.whatsapp_template_overdue !== undefined && body.whatsapp_template_overdue !== null && body.whatsapp_template_overdue !== '') {
      if (!isNonEmptyString(body.whatsapp_template_overdue)) {
        return NextResponse.json({ error: 'whatsapp_template_overdue must be a non-empty string' }, { status: 400 })
      }
    }
    if (body.whatsapp_template_payment !== undefined && body.whatsapp_template_payment !== null && body.whatsapp_template_payment !== '') {
      if (!isNonEmptyString(body.whatsapp_template_payment)) {
        return NextResponse.json({ error: 'whatsapp_template_payment must be a non-empty string' }, { status: 400 })
      }
    }

    // Only accept known keys. For secret keys, an omitted/blank value means
    // "keep the existing secret" — never overwrite with an empty string.
    const allowed = Object.keys(parseSettings([])) as SettingKey[]
    const patch: Partial<Settings> = {}
    const changes: Record<string, { old: string | null; new: string | null }> = {}

    // Get current settings for comparison
    const currentSettingsRows = await getSettingsRows()
    const currentSettings = parseSettings(currentSettingsRows)

    for (const key of allowed) {
      if (!(key in body)) continue
      const value = body[key]
      let newValue: string | null = null

      if (SECRET_SETTING_KEYS.includes(key)) {
        if (value === undefined || value === null || String(value) === '') continue
        newValue = String(value)
        ;(patch as Record<string, unknown>)[key] = newValue
      } else {
        newValue = value
        ;(patch as Record<string, unknown>)[key] = newValue
      }

      // Track changes for audit logging
      const oldValue = currentSettings[key] ?? null
      changes[key] = { old: oldValue, new: newValue !== undefined && newValue !== null ? String(newValue) : null }
    }

    await upsertSettings(serializeSettings(patch))

    // Log changes for audit
    for (const [key, change] of Object.entries(changes)) {
      await logSettingsChange(key, change.old, change.new, session.email)
    }

    const settings = parseSettings(await getSettingsRows())
    return NextResponse.json({ success: true, ...toClientView(settings) })
  } catch (error) {
    return errorResponse(error, 'PUT /api/settings')
  }
}
