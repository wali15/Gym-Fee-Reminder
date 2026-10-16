'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // Simplified effect - in a real app, you might check auth status here
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      // Login successful - redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError('Login failed - please check your credentials')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full space-y-8">
        <div className="text-center">
          <h1 className="text-display-md font-bold text-foreground">
            Gym Fee Reminder
          </h1>
          <p className="text-title-sm text-muted-foreground/60 mt-2">
            Sign in to manage your gym membership
          </p>
        </div>

        <div className="glass-panel-dark w-full max-w-md">
          <form onSubmit={handleLogin} className="space-y-6 p-8">
            <div className="space-y-4">
              <label htmlFor="login-email" className="form-label">
                Email Address <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                id="login-email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-premium w-full"
                autoComplete="email"
                placeholder="Enter your email address"
              />
            </div>

            <div className="space-y-4">
              <label htmlFor="login-password" className="form-label">
                Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-premium w-full pr-12"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-0 bottom-0 flex items-center px-2 text-muted-foreground/60 hover:text-muted-foreground/90"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7-7-7 7-7Z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 12l8.954-8.955c.44-.439.647-1.04.207-1.503-.44-.463-1.04-.439-1.503.207L2.25 12z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">
                {error}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-premium btn-premium-primary w-full hover-lift transition-all duration-200"
              >
                {submitting ? (
                  <>
                    Signing in...
                    <svg className="ml-2 h-4 w-4 animate-loading-bar" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.125 4 7 4s7-1.79 7-4V7m3-3V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v1m5 7v-2m0 2v2" />
                    </svg>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

            <div className="text-center text-xs text-muted-foreground/50 mt-6">
              <p>Don't have an account? Contact your gym administrator to get started.</p>
            </div>
          </form>
        </div>

        <div className="text-center text-xs text-muted-foreground/40">
          &copy; {new Date().getFullYear()} Gym Fee Reminder. All rights reserved.
        </div>
      </div>
    </div>
  )
}