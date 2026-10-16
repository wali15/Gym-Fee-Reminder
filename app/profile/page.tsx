'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader, type HeaderUser } from '@/components/AppHeader'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<HeaderUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Profile fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Google SSO state
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleEmail, setGoogleEmail] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/profile')
        if (res.status === 401) {
          router.push('/login')
          return
        }
        const data = await res.json()
        if (data.user) {
          setUser(data.user)
          setName(data.user.name || '')
          setEmail(data.user.email || '')
          // Check if Google SSO is connected (we'd need to extend our user model for this)
          // For now, we'll check query params from OAuth callback
        }
      } catch {
        showToast('Failed to load profile', 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  useEffect(() => {
    // Check for Google SSO success in query params
    if (typeof window !== 'undefined') {
      const urlParams = new URL(window.location.href)
      const googleSso = urlParams.searchParams.get('google_sso')
      const email = urlParams.searchParams.get('email')
      const name = urlParams.searchParams.get('name')

      if (googleSso === 'success' && email) {
        setGoogleConnected(true)
        setGoogleEmail(email)
        // Update the profile with Google info if not already set
        if (name) setName(decodeURIComponent(name))
        if (email) setEmail(decodeURIComponent(email))
        showToast('Google account connected successfully', 'success')

        // Clear query params
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      if (data.user) setUser(data.user)
      showToast('Profile updated', 'success')
      router.refresh()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error')
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to change password')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast('Password changed', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to change password', 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleConnectGoogle = async () => {
    // Initiate Google OAuth flow
    window.location.href = '/api/auth/google';
  }

  const handleDisconnectGoogle = async () => {
    setSavingProfile(true)
    try {
      const res = await fetch('/api/auth/google/disconnect', {
        method: 'PUT',
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to disconnect Google account')
      }
      setGoogleConnected(false)
      setGoogleEmail('')
      showToast('Google account disconnected', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to disconnect Google account', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full bg-primary/20"></div>
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="w-[3px] h-[3px] bg-primary rounded-full animate-loading-bar" style={{ width: '100%' }}></div>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground/80">Loading profile...</p>
      </div>
    )
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
          <h1 className="text-display-md font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground/60 mt-2">Manage your account details.</p>
        </div>

        <section className="card-section-lg hover-lift">
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title-md font-semibold text-foreground">Account details</h2>
              <p className="text-sm text-muted-foreground/60">Update your personal information</p>
            </div>
            <form
              onSubmit={handleSaveProfile}
              className="space-y-5"
            >
              <div className="space-y-4">
                <label htmlFor="profile-name" className="form-label">
                  Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="profile-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`input-premium w-full`}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-4">
                <label htmlFor="profile-email" className="form-label">
                  Email <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  id="profile-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`input-premium w-full`}
                  autoComplete="email"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="badge-premium badge-premium-outline text-xs font-medium px-2.5 py-0.5 rounded-lg">
                  {user?.role === 'admin' ? 'Admin' : 'Standard'}
                </span>
                <span className="text-sm text-muted-foreground/50">Your role is set by an administrator.</span>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn-premium btn-premium-primary hover-lift w-full"
                >
                  {savingProfile ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="card-section-lg hover-lift">
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title-md font-semibold text-foreground">Change password</h2>
              <p className="text-sm text-muted-foreground/60">Update your account password</p>
            </div>
            <form
              onSubmit={handleChangePassword}
              className="space-y-5"
            >
              <div className="space-y-4">
                <label htmlFor="current-password" className="form-label">
                  Current password <span className="text-destructive">*</span>
                </label>
                <input
                  type="password"
                  id="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`input-premium w-full`}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-4">
                <label htmlFor="new-password" className="form-label">
                  New password <span className="text-destructive">*</span>
                </label>
                <input
                  type="password"
                  id="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`input-premium w-full`}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-4">
                <label htmlFor="confirm-password" className="form-label">
                  Confirm new password <span className="text-destructive">*</span>
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`input-premium w-full`}
                  autoComplete="new-password"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="btn-premium btn-premium-primary hover-lift w-full"
                >
                  {savingPassword ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Google SSO Section */}
        <section className="card-section-lg hover-lift">
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title-md font-semibold text-foreground">Google Account</h2>
              <p className="text-sm text-muted-foreground/60">Connect your Google account to sign in faster and securely.</p>
            </div>
            {googleConnected ? (
              <>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground/60 mb-4">
                    Connected as: <span className="font-medium text-foreground">{googleEmail}</span>
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleDisconnectGoogle}
                    disabled={savingProfile}
                    className="btn-premium btn-premium-destructive hover-lift w-full"
                  >
                    {savingProfile ? 'Saving…' : 'Disconnect Google Account'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground/60 mb-4">
                    Connect your Google account to sign in faster and securely.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleConnectGoogle}
                    className="btn-premium btn-premium-primary hover-lift w-full"
                  >
                    Connect Google Account
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}