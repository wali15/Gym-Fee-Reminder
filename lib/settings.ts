// Runtime configuration model.
//
// PURE module — no driver import — so it can be shared by the Next.js app and the
// standalone Netlify function. It knows how to turn the `settings` key/value rows
// into a typed `Settings` object (with sensible defaults + env fallbacks) and how
// to derive the resolved configs the notification/reminder code consumes.
//
// This module is designed to be tree-shakeable and safe for bundling in both
// Next.js frontend and Netlify functions.

export type SettingKey = keyof Settings

export interface Settings {
  // Branding / locale
  gym_name: string
  gym_contact_email: string
  currency: string
  timezone: string
  // Reminder scheduling
  reminder_enabled: boolean
  reminder_hour: number // 0-23, in `timezone`
  reminder_days_before: number
  // Email (Resend)
  email_enabled: boolean
  email_from_name: string
  email_from_address: string
  resend_api_key: string
  // WhatsApp (Meta Cloud API)
  whatsapp_enabled: boolean
  whatsapp_token: string
  whatsapp_phone_id: string
  whatsapp_lang: string
  whatsapp_template_due: string
  whatsapp_template_overdue: string
  whatsapp_template_payment: string
}

export const SETTING_DEFAULTS: Settings = {
  gym_name: 'FitLife Gym',
  gym_contact_email: '',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  reminder_enabled: true,
  reminder_hour: 9,
  reminder_days_before: 3,
  email_enabled: false,
  email_from_name: 'FitLife Gym',
  email_from_address: '',
  resend_api_key: '',
  whatsapp_enabled: false,
  whatsapp_token: '',
  whatsapp_phone_id: '',
  whatsapp_lang: 'en',
  whatsapp_template_due: 'fee_due_reminder',
  whatsapp_template_overdue: 'fee_overdue_reminder',
  whatsapp_template_payment: 'payment_confirmation',
}

type Kind = 'string' | 'number' | 'boolean'

const KINDS: Record<SettingKey, Kind> = {
  gym_name: 'string',
  gym_contact_email: 'string',
  currency: 'string',
  timezone: 'string',
  reminder_enabled: 'boolean',
  reminder_hour: 'number',
  reminder_days_before: 'number',
  email_enabled: 'boolean',
  email_from_name: 'string',
  email_from_address: 'string',
  resend_api_key: 'string',
  whatsapp_enabled: 'boolean',
  whatsapp_token: 'string',
  whatsapp_phone_id: 'string',
  whatsapp_lang: 'string',
  whatsapp_template_due: 'string',
  whatsapp_template_overdue: 'string',
  whatsapp_template_payment: 'string',
}

/** Secret settings never sent to the client in cleartext. */
export const SECRET_SETTING_KEYS: SettingKey[] = ['resend_api_key', 'whatsapp_token']

/** Env vars used as a fallback ONLY when the DB value is empty/unset. */
function envFallback(key: SettingKey): string | undefined {
  switch (key) {
    case 'resend_api_key':
      return process.env.RESEND_API_KEY
    case 'whatsapp_token':
      return process.env.WHATSAPP_TOKEN
    case 'whatsapp_phone_id':
      return process.env.WHATSAPP_PHONE_ID
    case 'gym_contact_email':
      return process.env.ADMIN_EMAIL
    default:
      return undefined
  }
}

function coerce(key: SettingKey, raw: string): unknown {
  switch (KINDS[key]) {
    case 'boolean':
      return raw === 'true' || raw === '1'
    case 'number': {
      const n = Number(raw)
      return Number.isFinite(n) ? n : (SETTING_DEFAULTS[key] as number)
    }
    default:
      return raw
  }
}

export type SettingRow = { key: string; value: string | null }

/**
 * Merge DB rows over defaults, applying env fallbacks for empty values.
 *
 * @param rows - Array of setting rows from the database
 * @returns Settings object with all values resolved
 */
export function parseSettings(rows: SettingRow[]): Settings {
  const map = new Map(rows.map((r) => [r.key, r.value]))
  const result: Settings = { ...SETTING_DEFAULTS }
  const assign = result as unknown as Record<string, unknown>

  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    const raw = map.get(key)
    if (raw !== undefined && raw !== null && raw !== '') {
      assign[key] = coerce(key, raw)
    } else {
      const env = envFallback(key)
      if (env) assign[key] = coerce(key, env)
    }
  }
  return result
}

/**
 * Serialize a partial Settings patch into string key/value pairs for storage.
 *
 * @param patch - Partial Settings object to serialize
 * @returns Record of string key/value pairs suitable for database storage
 */
export function serializeSettings(patch: Partial<Settings>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    out[key] = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)
  }
  return out
}

// ---- Resolved configs consumed by the notification / reminder code ----------

export interface EmailConfig {
  enabled: boolean
  apiKey: string
  fromName: string
  fromAddress: string
  gymName: string
  currency: string
  appUrl: string
  contactEmail: string
}

/**
 * Convert Settings to EmailConfig for Resend email service.
 *
 * @param s - Settings object
 * @returns EmailConfig object for email service configuration
 */
export function toEmailConfig(s: Settings): EmailConfig {
  return {
    enabled: s.email_enabled && !!s.resend_api_key && !!s.email_from_address,
    apiKey: s.resend_api_key,
    fromName: s.email_from_name || s.gym_name,
    fromAddress: s.email_from_address,
    gymName: s.gym_name,
    currency: s.currency,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || '',
    contactEmail: s.gym_contact_email,
  }
}

export interface WhatsAppConfig {
  enabled: boolean
  token: string
  phoneId: string
  lang: string
  templateDue: string
  templateOverdue: string
  templatePayment: string
  currency: string
}

/**
 * Convert Settings to WhatsAppConfig for Meta Cloud API.
 *
 * @param s - Settings object
 * @returns WhatsAppConfig object for WhatsApp service configuration
 */
export function toWhatsAppConfig(s: Settings): WhatsAppConfig {
  return {
    enabled: s.whatsapp_enabled && !!s.whatsapp_token && !!s.whatsapp_phone_id,
    token: s.whatsapp_token,
    phoneId: s.whatsapp_phone_id,
    lang: s.whatsapp_lang || 'en',
    templateDue: s.whatsapp_template_due,
    templateOverdue: s.whatsapp_template_overdue,
    templatePayment: s.whatsapp_template_payment,
    currency: s.currency,
  }
}

export interface ReminderConfig {
  enabled: boolean
  hour: number
  daysBefore: number
  timezone: string
}

/**
 * Convert Settings to ReminderConfig for reminder scheduling.
 *
 * @param s - Settings object
 * @returns ReminderConfig object for reminder scheduling
 */
export function toReminderConfig(s: Settings): ReminderConfig {
  return {
    enabled: s.reminder_enabled,
    hour: s.reminder_hour,
    daysBefore: s.reminder_days_before,
    timezone: s.timezone,
  }
}

// ---- Formatting / timezone helpers (Intl-based, no deps) --------------------

/**
 * Format a number as currency string using Intl.NumberFormat.
 *
 * @param amount - The amount to format
 * @param currency - The currency code (default: 'INR')
 * @returns Formatted currency string
 *
 * @example
 *   formatCurrency(1500, 'USD') // "$1,500.00"
 *   formatCurrency(2500) // "₹2,500.00"
 */
export function formatCurrency(amount: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount}`
  }
}

/**
 * Get current hour (0-23) in the given IANA timezone.
 *
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @param date - Date to get hour from (default: now)
 * @returns Hour in 0-23 range
 *
 * @example
 *   hourInTz('Asia/Kolkata') // 14 (if current UTC time is 08:30)
 */
export function hourInTz(timezone: string, date: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).formatToParts(date)
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
    return h === 24 ? 0 : h // some ICU builds emit 24 for midnight
  } catch {
    return date.getUTCHours()
  }
}

/**
 * Get today's date as YYYY-MM-DD in the given IANA timezone.
 *
 * @param timezone - IANA timezone string (e.g., 'Europe/London')
 * @param date - Date to get today from (default: now)
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 *   todayInTz('America/Los_Angeles') // "2023-12-31" (if current UTC date is 2024-01-01)
 */
export function todayInTz(timezone: string, date: Date = new Date()): string {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch {
    return date.toISOString().split('T')[0]
  }
}

/**
 * Validate if a string is a valid IANA timezone.
 *
 * @param tz - Timezone string to validate
 * @returns true if valid timezone, false otherwise
 *
 * @example
 *   isValidTimezone('UTC') // true
 *   isValidTimezone('Invalid/Timezone') // false
 */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}
