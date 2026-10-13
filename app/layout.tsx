import type { Metadata } from 'next'
import './globals.css'
import { SWRegister } from '@/components/SWRegister'

export const metadata: Metadata = {
  title: 'Gym Fee Reminder - Membership Management',
  description: 'Automated gym fee reminders via Email and WhatsApp. Track membership dues, send automated reminders, and manage payments.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gym Fee Reminder',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#16a34a" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Gym Fee Reminder" />
      </head>
      <body className="min-h-screen bg-gray-50">
        {children}
        <SWRegister />
      </body>
    </html>
  )
}