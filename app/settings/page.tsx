'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader, type HeaderUser } from '@/components/AppHeader'
import type { Settings } from '@/lib/settings'

type SecretHint = { set: boolean; last4: string }
type SecretsView = {
  resend_api_key: SecretHint;
  whatsapp_token: SecretHint;
  sso_google_client_secret: SecretHint;
  smtp_password: SecretHint;
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<HeaderUser | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [secrets, setSecrets] = useState<SecretsView | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [verifyingSso, setVerifyingSso] = useState(false)
  const [verifyingSmtp, setVerifyingSmtp] = useState(false)

  // Secret inputs are separate: blank means "keep the existing value".
  const [resendKey, setResendKey] = useState('')
  const [whatsappToken, setWhatsappToken] = useState('')
  const [ssoGoogleSecret, setSsoGoogleSecret] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')

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
        // Set secret input states from the secrets object (for display only)
        if (data.secrets) {
          setResendKey('')
          setWhatsappToken('')
          setSsoGoogleSecret('')
          setSmtpPassword('')
        }
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
      delete payload.smtp_password
      delete payload.sso_google_client_secret
      if (resendKey.trim()) payload.resend_api_key = resendKey.trim()
      if (whatsappToken.trim()) payload.whatsapp_token = whatsappToken.trim()
      if (ssoGoogleSecret.trim()) payload.sso_google_client_secret = ssoGoogleSecret.trim()
      if (smtpPassword.trim()) payload.smtp_password = smtpPassword.trim()

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
      setSsoGoogleSecret('')
      setSmtpPassword('')
      showToast('Settings saved', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleVerifySso = async () => {
    if (!settings?.sso_google_client_id || !ssoGoogleSecret.trim()) {
      showToast('Please enter both Client ID and Client Secret', 'error')
      return
    }

    setVerifyingSso(true)
    try {
      const res = await fetch('/api/auth/google/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: settings.sso_google_client_id,
          clientSecret: ssoGoogleSecret.trim(),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Verification failed')
      }

      showToast('Google SSO configuration verified successfully!', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Verification failed', 'error')
    } finally {
      setVerifyingSso(false)
    }
  }

  const handleVerifySmtp = async () => {
    if (!settings?.smtp_host || !settings?.smtp_port || !settings?.smtp_username || !smtpPassword.trim()) {
      showToast('Please fill in all SMTP relay fields', 'error')
      return
    }

    setVerifyingSmtp(true)
    try {
      const res = await fetch('/api/settings/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: settings.smtp_host,
          port: settings.smtp_port,
          username: settings.smtp_username,
          password: smtpPassword.trim(),
          secure: settings.smtp_secure,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'SMTP test failed')
      }

      showToast('SMTP relay test successful!', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'SMTP test failed', 'error')
    } finally {
      setVerifyingSmtp(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full bg-primary/20"></div>
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="w-[3px] h-[3px] bg-primary rounded-full animate-loading-bar" style={{ width: '100%' }}></div>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground/80">Loading settings...</p>
      </div>
    )
  }

  function secretPlaceholder(hint?: SecretHint): string {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return 'Not set'
    }

    if (hint?.set) {
      return '•••• ' + hint.last4 + ' (leave blank to keep)'
    }
    return 'Not set'
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />

      <main className="container-premium py-12">
        {toast && (
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white transition-all duration-200 flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-primary/90 backdrop-blur-sm border border-primary/20' : 'bg-destructive/90 backdrop-blur-sm border border-destructive/20'
            }" animation="fade-in slide-up">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {toast.type === 'success' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                )}
              </svg>
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-display-md font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground/60 mt-2">Configure your gym, reminders, and notifications.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Gym / branding */}
          <section className="card-section-lg hover-lift">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title-md font-semibold text-foreground">Gym</h2>
                <p className="text-sm text-muted-foreground/60">Basic information about your gym</p>
              </div>
              <div className="space-y-4">
                <label htmlFor="gym-name" className="form-label">
                  Gym name
                </label>
                <input
                  type="text"
                  id="gym-name"
                  value={settings.gym_name}
                  onChange={(e) => set('gym_name', e.target.value)}
                  className="input-premium w-full"
                />
              </div>
              <div className="space-y-4">
                <label htmlFor="gym-contact-email" className="form-label">
                  Contact email
                </label>
                <input
                  type="email"
                  id="gym-contact-email"
                  value={settings.gym_contact_email}
                  onChange={(e) => set('gym_contact_email', e.target.value)}
                  className="input-premium w-full"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label htmlFor="currency" className="form-label">
                    Currency
                  </label>
                  <input
                    type="text"
                    id="currency"
                    value={settings.currency}
                    onChange={(e) => set('currency', e.target.value.toUpperCase())}
                    className="input-premium w-full"
                    placeholder="INR"
                  />
                </div>
                <div className="space-y-4">
                  <label htmlFor="timezone" className="form-label">
                    Timezone
                  </label>
                  <input
                    type="text"
                    id="timezone"
                    value={settings.timezone}
                    onChange={(e) => set('timezone', e.target.value)}
                    className="input-premium w-full"
                    placeholder="Asia/Kolkata"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Reminders */}
          <section className="card-section-lg hover-lift">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title-md font-semibold text-foreground">Reminders</h2>
                <p className="text-sm text-muted-foreground/60">Configure automatic reminders for members</p>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-sm font-medium text-muted-foreground/80">
                  <input
                    type="checkbox"
                    checked={settings.reminder_enabled}
                    onChange={(e) => set('reminder_enabled', e.target.checked)}
                    className="h-4 w-4 rounded border-border/50 text-primary-600 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <span>Send automatic reminders</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label htmlFor="reminder-hour" className="form-label">
                    Reminder hour (0–23, in your timezone)
                  </label>
                  <input
                    type="number"
                    id="reminder-hour"
                    min={0}
                    max={23}
                    value={settings.reminder_hour}
                    onChange={(e) => set('reminder_hour', Number(e.target.value))}
                    className="input-premium w-full"
                  />
                </div>
                <div className="space-y-4">
                  <label htmlFor="reminder-days-before" className="form-label">
                    Days before due date
                  </label>
                  <input
                    type="number"
                    id="reminder-days-before"
                    min={0}
                    max={31}
                    value={settings.reminder_days_before}
                    onChange={(e) => set('reminder_days_before', Number(e.target.value))}
                    className="input-premium w-full"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Email */}
          <section className="card-section-lg hover-lift">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title-md font-semibold text-foreground">Email (Resend)</h2>
                <p className="text-sm text-muted-foreground/60">Configure email reminders via Resend</p>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-sm font-medium text-muted-foreground/80">
                  <input
                    type="checkbox"
                    checked={settings.email_enabled}
                    onChange={(e) => set('email_enabled', e.target.checked)}
                    className="h-4 w-4 rounded border-border/50 text-primary-600 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <span>Enable email reminders</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label htmlFor="email-from-name" className="form-label">
                    From name
                  </label>
                  <input
                    type="text"
                    value={settings.email_from_name}
                    onChange={(e) => set('email_from_name', e.target.value)}
                    className="input-premium w-full"
                  />
                </div>
                <div className="space-y-4">
                  <label htmlFor="email-from-address" className="form-label">
                    From address
                  </label>
                  <input
                    type="email"
                    value={settings.email_from_address}
                    onChange={(e) => set('email_from_address', e.target.value)}
                    className="input-premium w-full"
                    placeholder="reminders@yourgym.com"
                  />
                </div>
              </div>
              <div className="space-y-6">
                <label htmlFor="resend-api-key" className="form-label">
                  Resend API key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={resendKey}
                    onChange={(e) => setResendKey(e.target.value)}
                    className={`input-premium w-full ${!settings.email_enabled ? 'opacity-50' : ''}`}
                    placeholder={secretPlaceholder(secrets?.resend_api_key)}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupPassword(!showSetupPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2"
                    aria-label="Toggle password visibility"
                  >
                    {showSetupPassword ? (
                      <svg className="h-4 w-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A12.022 12.022 0 0112 15.75c0-1.624.226-3.179.648-4.562A5.988 5.988 0 0012 9c0-3.315-2.69-6-6-6S1 5.685 1 9a5.988 5.988 0 001.125 2.872c.422 1.383.648 2.938.648 4.562A12.022 12.022 0 0012 21c3.315 0 6-2.69 6-6s-2.69-6-6-6z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A12.022 12.022 0 0112 15.75c0-1.624.226-3.179.648-4.562A5.988 5.988 0 0012 9c0-3.315-2.69-6-6-6S1 5.685 1 9a5.988 5.988 0 001.125 2.872c.422 1.383.648 2.938.648 4.562A12.022 12.022 0 0012 21c3.315 0 6-2.69 6-6s-2.69-6-6-6zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* WhatsApp */}
          <section className="card-section-lg hover-lift">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title-md font-semibold text-foreground">WhatsApp (Meta Cloud API)</h2>
                <p className="text-sm text-muted-foreground/60">Configure WhatsApp reminders via Meta Cloud API</p>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-sm font-medium text-muted-foreground/80">
                  <input
                    type="checkbox"
                    checked={settings.whatsapp_enabled}
                    onChange={(e) => set('whatsapp_enabled', e.target.checked)}
                    className="h-4 w-4 rounded border-border/50 text-primary-600 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <span>Enable WhatsApp reminders</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label htmlFor="whatsapp-phone-id" className="form-label">
                    Phone number ID
                  </label>
                  <input
                    type="text"
                    value={settings.whatsapp_phone_id}
                    onChange={(e) => set('whatsapp_phone_id', e.target.value)}
                    className="input-premium w-full"
                  />
                </div>
                <div className="space-y-4">
                  <label htmlFor="whatsapp-lang" className="form-label">
                    Template language
                  </label>
                  <input
                    type="text"
                    value={settings.whatsapp_lang}
                    onChange={(e) => set('whatsapp_lang', e.target.value)}
                    className="input-premium w-full"
                  />
                </div>
              </div>
              <div className="space-y-6">
                <label htmlFor="whatsapp-token" className="form-label">
                  WhatsApp Token
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={whatsappToken}
                    onChange={(e) => setWhatsappToken(e.target.value)}
                    className={`input-premium w-full ${!settings.whatsapp_enabled ? 'opacity-50' : ''}`}
                    placeholder={secretPlaceholder(secrets?.whatsapp_token)}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupPassword(!showSetupPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2"
                    aria-label="Toggle password visibility"
                  >
                    {showSetupPassword ? (
                      <svg className="h-4 w-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A12.022 12.022 0 0112 15.75c0-1.624.226-3.179.648-4.562A5.988 5.988 0 0012 9c0-3.315-2.69-6-6-6S1 5.685 1 9a5.988 5.988 0 001.125 2.872c.422 1.383.648 2.938.648 4.562A12.022 12.022 0 0012 21c3.315 0 6-2.69 6-6s-2.69-6-6-6z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A12.022 12.022 0 0112 15.75c0-1.624.226-3.179.648-4.562A5.988 5.988 0 0012 9c0-3.315-2.69-6-6-6S1 5.685 1 9a5.988 5.988 0 001.125 2.872c.422 1.383.648 2.938.648 4.562A12.022 12.022 0 0012 21c3.315 0 6-2.69 6-6s-2.69-6-6-6zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SMTP */}
          <section className="card-section-lg hover-lift">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title-md font-semibold text-foreground">SMTP Relay</h2>
                <p className="text-sm text-muted-foreground/60">Configure SMTP relay for email delivery</p>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-sm font-medium text-muted-foreground/80">
                  <input
                    type="checkbox"
                    checked={settings.smtp_enabled}
                    onChange={(e) => set('smtp_enabled', e.target.checked)}
                    className="h-4 w-4 rounded border-border/50 text-primary-600 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <span>Enable SMTP relay</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label htmlFor="smtp-host" className="form-label">
                    Host
                  </label>
                  <input
                    type="text"
                    value={settings.smtp_host}
                    onChange={(e) => set('smtp_host', e.target.value)}
                    className="input-premium w-full"
                  />
                </div>
                <div className="space-y-4">
                  <label htmlFor="smtp-port" className="form-label">
                    Port
                  </label>
                  <input
                    type="number"
                    id="smtp-port"
                    min={1}
                    max={65535}
                    value={settings.smtp_port}
                    onChange={(e) => set('smtp_port', Number(e.target.value))}
                    className="input-premium w-full"
                  />
                </div>
                <div className="space-y-4">
                  <label htmlFor="smtp-username" className="form-label">
                    Username
                  </label>
                  <input
                    type="text"
                    value={settings.smtp_username}
                    onChange={(e) => set('smtp_username', e.target.value)}
                    className="input-premium w-full"
                  />
                </div>
                <div className="space-y-4">
                  <label htmlFor="smtp-secure" className="form-label">
                    Secure connection
                  </label>
                  <input
                    type="checkbox"
                    checked={settings.smtp_secure}
                    onChange={(e) => set('smtp_secure', e.target.checked)}
                    className="h-4 w-4 rounded border-border/50 text-primary-600 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="space-y-6">
                <label htmlFor="smtp-password" className="form-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    className={`input-premium w-full ${!settings.smtp_enabled ? 'opacity-50' : ''}`}
                    placeholder={secretPlaceholder(secrets?.smtp_password)}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupPassword(!showSetupPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2"
                    aria-label="Toggle password visibility"
                  >
                    {showSetupPassword ? (
                      <svg className="h-4 w-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A12.022 12.022 0 0112 15.75c0-1.624.226-3.179.648-4.562A5.988 5.988 0 0012 9c0-3.315-2.69-6-6-6S1 5.685 1 9a5.988 5.988 0 001.125 2.872c.422 1.383.648 2.938.648 4.562A12.022 12.022 0 0012 21c3.315 0 6-2.69 6-6s-2.69-6-6-6z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A12.022 12.022 0 0112 15.75c0-1.624.226-3.179.648-4.562A5.988 5.988 0 0012 9c0-3.315-2.69-6-6-6S1 5.685 1 9a5.988 5.988 0 001.125 2.872c.422 1.383.648 2.938.648 4.562A12.022 12.022 0 0012 21c3.315 0 6-2.69 6-6s-2.69-6-6-6zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Google SSO */}
          <section className="card-section-lg hover-lift">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title-md font-semibold text-foreground">Google SSO</h2>
                <p className="text-sm text-muted-foreground/60">Configure Google Sign-In</p>
              </div>
              <div className="space-y-4">
                <label htmlFor="sso-google-client-id" className="form-label">
                  Client ID
                </label>
                <input
                  type="text"
                  id="sso-google-client-id"
                  value={settings.sso_google_client_id}
                  onChange={(e) => set('sso_google_client_id', e.target.value)}
                  className="input-premium w-full"
                />
              </div>
              <div className="space-y-4">
                <label htmlFor="sso-google-client-secret" className="form-label">
                  Client Secret
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={ssoGoogleSecret}
                    onChange={(e) => setSsoGoogleSecret(e.target.value)}
                    className={`input-premium w-full ${!settings.sso_google_client_id ? 'opacity-50' : ''}`}
                    placeholder={secretPlaceholder(secrets?.sso_google_client_secret)}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupPassword(!showSetupPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2"
                    aria-label="Toggle password visibility"
                  >
                    {showSetupPassword ? (
                      <svg className="h-4 w-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A12.022 12.022 0 0112 15.75c0-1.624.226-3.179.648-4.562A5.988 5.988 0 0012 9c0-3.315-2.69-6-6-6S1 5.685 1 9a5.988 5.988 0 001.125 2.872c.422 1.383.648 2.938.648 4.562A12.022 12.022 0 0012 21c3.315 0 6-2.69 6-6s-2.69-6-6-6z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A12.022 12.022 0 0112 15.75c0-1.624.226-3.179.648-4.562A5.988 5.988 0 0012 9c0-3.315-2.69-6-6-6S1 5.685 1 9a5.988 5.988 0 001.125 2.872c.422 1.383.648 2.938.648 4.562A12.022 12.022 0 0012 21c3.315 0 6-2.69 6-6s-2.69-6-6-6zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleVerifySso}
                  disabled={verifyingSso}
                  className="btn-premium btn-premium-outline hover-lift w-full"
                >
                  {verifyingSso ? 'Verifying...' : 'Verify Configuration'}
                </button>
              </div>
            </div>
          </section>
        </form>
      </main>
    </div>
  )
}