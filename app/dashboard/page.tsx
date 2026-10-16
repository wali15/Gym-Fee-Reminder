'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MemberTable } from '@/components/MemberTable'
import { MemberForm } from '@/components/MemberForm'
import { AppHeader, type HeaderUser } from '@/components/AppHeader'

interface Member {
  id: number
  name: string
  email: string | null
  phone: string | null
  fee_amount: number
  due_date: string
  status: 'paid' | 'due' | 'overdue'
  last_reminder_sent: string | null
}

interface Stats {
  total: number
  paid: number
  due: number
  overdue: number
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<HeaderUser | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [stats, setStats] = useState<Stats>({ total: 0, paid: 0, due: 0, overdue: 0 })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchUser()
    fetchMembers()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth')
      if (!response.ok) return
      const data = await response.json()
      if (data.authenticated && data.user) setUser(data.user)
    } catch {
      // Header simply renders without role-gated links until this resolves.
    }
  }

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members')
      if (response.status === 401) {
        router.push('/login')
        return
      }
      const data = await response.json()
      setMembers(data.members || [])
      calculateStats(data.members || [])
    } catch (error) {
      console.error('Failed to fetch members:', error)
      showToast('Failed to load members', 'error')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (members: Member[]) => {
    setStats({
      total: members.length,
      paid: members.filter(m => m.status === 'paid').length,
      due: members.filter(m => m.status === 'due').length,
      overdue: members.filter(m => m.status === 'overdue').length,
    })
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleRemind = async (id: number) => {
    try {
      const response = await fetch(`/api/remind/${id}`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      await fetchMembers()
      showToast('Reminder sent successfully!', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to send reminder', 'error')
    }
  }

  const handleMarkPaid = async (id: number) => {
    try {
      const response = await fetch(`/api/members?id=${id}&action=paid`, {
        method: 'PATCH',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      await fetchMembers()
      showToast('Member marked as paid!', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to mark as paid', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/members/${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      await fetchMembers()
      showToast('Member deleted successfully!', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to delete member', 'error')
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingMember(null)
    fetchMembers()
    showToast(editingMember ? 'Member updated!' : 'Member added!', 'success')
  }

  const handleEdit = (member: Member) => {
    setEditingMember(member)
    setShowForm(true)
  }

  const handleAddNew = () => {
    setEditingMember(null)
    setShowForm(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-loading-bar w-56 h-2 bg-primary/20 rounded-full overflow-hidden">
          <div className="h-full w-0 bg-primary transition-all duration-2000 ease-in-out" style={{ width: '100%' }}></div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground/80">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user}>
        <button
          onClick={handleAddNew}
          className="btn-premium btn-premium-accent hover-lift"
        >
          + Add Member
        </button>
      </AppHeader>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card-premium hover-lift">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground/80">Total Members</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            </div>
          </div>
          <div className="card-premium hover-lift">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground/80">Paid</p>
              <p className="text-3xl font-bold text-primary-foreground">{stats.paid}</p>
            </div>
          </div>
          <div className="card-premium hover-lift">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground/80">Due Soon</p>
              <p className="text-3xl font-bold text-accent-foreground">{stats.due}</p>
            </div>
          </div>
          <div className="card-premium hover-lift">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground/80">Overdue</p>
              <p className="text-3xl font-bold text-destructive-foreground">{stats.overdue}</p>
            </div>
          </div>
        </div>

        {showForm ? (
          <div className="card-section-lg hover-lift">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title-md font-semibold text-foreground">
                  {editingMember ? 'Edit Member' : 'Add New Member'}
                </h2>
                <button
                  onClick={() => { setShowForm(false); setEditingMember(null); }}
                  className="text-muted-foreground/60 hover:text-muted-foreground hover-lift transition-all duration-200"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div>
                <MemberForm
                  initialData={editingMember || undefined}
                  onSuccess={handleFormSuccess}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="card-section-lg hover-lift">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title-md font-semibold text-foreground">Members</h2>
                {members.length > 0 && (
                  <span className="text-sm text-muted-foreground/60">
                    {members.length} member{members.length !== 1 ? 's' : ''} • Last updated: {new Date().toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div>
                <MemberTable
                  members={members}
                  onRemind={handleRemind}
                  onMarkPaid={handleMarkPaid}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  canDelete={user?.role === 'admin'}
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 text-center text-sm text-muted-foreground/60">
          <p>Gym Fee Reminder System • Automated Email & WhatsApp reminders</p>
        </div>
      </main>

      {showForm && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur z-40"
          onClick={() => { setShowForm(false); setEditingMember(null); }}
        />
      )}
    </div>
  )
}