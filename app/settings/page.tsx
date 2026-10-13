'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader, type HeaderUser } from '@/components/AppHeader'
import type { Settings } from '@/lib/settings'

type SecretHint = { set: boolean; last4: string }
type SecretsView = { resend_api_key: SecretHint; whatsapp_token: SecretHint }

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<HeaderUser | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [secrets, setSecrets] = useState<SecretsView | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Secret inputs are separate: blank means "keep the existing value".
  const [resendKey, setResendKey] = useState('')
  const [whatsappToken, setWhatsappToken] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const [authRes, settingsRes] = await Promise.all([
          fetch('/api/auth'),
          fetch('/api/settings'),
        ])
        if (authRes.ok) {
          const authData = await authRes.json()
          if (authData.authenticated && authData.user) setUser(authData.user)
        }
        if (settingsRes.status === 401 || settingsRes.status === 403) {
          router.push('/dashboard')
          return
        }
        const data = await settingsRes.json()
        setSettings(data.settings)
        setSecrets(data.secrets)
      } catch {
        showToast('Failed to load settings', 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    try {
      // Send all non-secret settings; only include secret fields when the user
      // typed a new value (blank = keep existing).
      const payload: Record<string, unknown> = { ...settings }
      delete payload.resend_api_key
      delete payload.whatsapp_token
      if (resendKey.trim()) payload.resend_api_key = resendKey.trim()
      if (whatsappToken.trim()) payload.whatsapp_token = whatsappToken.trim()

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSettings(data.settings)
      setSecrets(data.secrets)
      setResendKey('')
      setWhatsappToken('')
      showToast('Settings saved', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  const secretPlaceholder = (hint?: SecretHint) =>
    hint?.set ? `•••• ${hint.last4} (leave blank to keep)` : 'Not set'

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg text-white ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure your gym, reminders, and notifications.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Gym / branding */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Gym</h2>
            <div>
              <label className={labelClass}>Gym name</label>
              <input
                type="text"
                value={settings.gym_name}
                onChange={(e) => set('gym_name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contact email</label>
              <input
                type="email"
                value={settings.gym_contact_email}
                onChange={(e) => set('gym_contact_email', e.target.value)}
                className={inputClass}
                placeholder="shown to members in emails"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Currency</label>
                <input
                  type="text"
                  value={settings.currency}
                  onChange={(e) => set('currency', e.target.value.toUpperCase())}
                  className={inputClass}
                  placeholder="INR"
                />
              </div>
              <div>
                <label className={labelClass}>Timezone</label>
                <input
                  type="text"
                  value={settings.timezone}
                  onChange={(e) => set('timezone', e.target.value)}
                  className={inputClass}
                  placeholder="Asia/Kolkata"
                />
              </div>
            </div>
          </section>

          {/* Reminders */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Reminders</h2>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.reminder_enabled}
                onChange={(e) => set('reminder_enabled', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Send automatic reminders</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Reminder hour (0–23, in your timezone)</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={settings.reminder_hour}
                  onChange={(e) => set('reminder_hour', Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Days before due date</label>
                <input
                  type="number"
                  min={0}
                  max={31}
                  value={settings.reminder_days_before}
                  onChange={(e) => set('reminder_days_before', Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Email */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Email (Resend)</h2>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.email_enabled}
                onChange={(e) => set('email_enabled', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Enable email reminders</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>From name</label>
                <input
                  type="text"
                  value={settings.email_from_name}
                  onChange={(e) => set('email_from_name', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>From address</label>
                <input
                  type="email"
                  value={settings.email_from_address}
                  onChange={(e) => set('email_from_address', e.target.value)}
                  className={inputClass}
                  placeholder="reminders@yourgym.com"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Resend API key</label>
              <input
                type="password"
                value={resendKey}
                onChange={(e) => setResendKey(e.target.value)}
                className={inputClass}
                placeholder={secretPlaceholder(secrets?.resend_api_key)}
                autoComplete="off"
              />
            </div>
          </section>

          {/* WhatsApp */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">WhatsApp (Meta Cloud API)</h2>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.whatsapp_enabled}
                onChange={(e) => set('whatsapp_enabled', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Enable WhatsApp reminders</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Phone number ID</label>
                <input
                  type="text"
                  value={settings.whatsapp_phone_id}
                  onChange={(e) => set('whatsapp_phone_id', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Template language</label>
                <input
                  type="text"
                  value={settings.whatsapp_lang}
                  onChange={(e) => set('whatsapp_lang', e.target.value)}
                  className={inputClass}
                  placeholder="en"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Access token</label>
              <input
                type="password"
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
                className={inputClass}
                placeholder={secretPlaceholder(secrets?.whatsapp_token)}
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Due template</label>
                <input
                  type="text"
                  value={settings.whatsapp_template_due}
                  onChange={(e) => set('whatsapp_template_due', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Overdue template</label>
                <input
                  type="text"
                  value={settings.whatsapp_template_overdue}
                  onChange={(e) => set('whatsapp_template_overdue', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Payment template</label>
                <input
                  type="text"
                  value={settings.whatsapp_template_payment}
                  onChange={(e) => set('whatsapp_template_payment', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
