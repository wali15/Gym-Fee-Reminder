'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

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

  const links = [
    { href: '/dashboard', label: 'Dashboard', show: true },
    { href: '/profile', label: 'Profile', show: true },
    { href: '/settings', label: 'Settings', show: isAdmin },
    { href: '/users', label: 'Users', show: isAdmin },
  ].filter((l) => l.show)

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

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
              <div className="h-10 w-10 rounded-xl bg-primary-600 flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 hidden sm:block">Gym Fee Reminder</h1>
            </Link>
            <nav className="flex items-center gap-1">
              {links.map((link) => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
              <span className="text-sm text-gray-500 hidden md:inline" title={user.email}>
                {user.name}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
