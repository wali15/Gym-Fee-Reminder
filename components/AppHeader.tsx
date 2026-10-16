'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import { useEffect, useState } from 'react'

export interface HeaderUser {
  id: number
  email: string
  role: 'admin' | 'standard'
  name: string
}

export function AppHeader({
  user,
  children,
}: {
  user: HeaderUser | null
  children?: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const isAdmin = user?.role === 'admin'
  const { theme, toggleTheme } = useTheme()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0)
    }

    window.addEventListener('scroll', handleScroll)
    // Initial check in case page loads scrolled
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })
    } catch {
      // Ignore network errors — still send the user back to login.
    }
    router.push('/login')
    router.refresh()
  }

  // Define navigation links
  const links = [
    { label: 'Dashboard', href: '/dashboard' },
    ...(isAdmin ? [
      { label: 'Members', href: '/members' },
      { label: 'Settings', href: '/settings' },
    ] : []),
    { label: 'Profile', href: '/profile' },
  ]

  return (
    <header className={`${scrolled ? 'shadow-card' : 'bg-background'} border-b border-border/50 backdrop-blur-sm transition-all duration-300`}>
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
              <div className="h-11 w-11 rounded-xl bg-primary/90 backdrop-blur flex items-center justify-center border border-primary/20">
                <svg className="h-6 w-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-display-sm font-bold text-foreground hidden sm:block">Gym Fee Reminder</h1>
            </Link>
            <nav className="flex items-center gap-2">
              {links.map((link) => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover-lift ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/5 border-border/50'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {children}
            {user && (
              <div className="flex items-center gap-2 text-sm font-medium text-foreground hidden md:inline">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <span className="text-primary-foreground font-medium">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="ml-2" title={user.email}>
                  {user.name}
                </span>
              </div>
            )}
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-muted/5 transition-all duration-200 hover-scale flex items-center justify-center"
              aria-label="Toggle dark mode"
            >
              {theme === 'light' ? (
                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-lg text-muted-foreground hover:text-foreground font-medium transition-all duration-200 hover-lift border border-transparent hover:border-muted/20"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}