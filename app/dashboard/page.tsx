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
      const response = await fetch(`/api/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-paid' }),
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user}>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          + Add Member
        </button>
      </AppHeader>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg text-white transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {toast.message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Total Members</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Paid</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{stats.paid}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Due Soon</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{stats.due}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Overdue</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        </div>

        {showForm ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingMember ? 'Edit Member' : 'Add New Member'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingMember(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <MemberForm 
                initialData={editingMember || undefined} 
                onSuccess={handleFormSuccess}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Members</h2>
            </div>
            <div className="p-6">
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
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Gym Fee Reminder System • Automated Email & WhatsApp reminders</p>
        </div>
      </main>

      {showForm && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => { setShowForm(false); setEditingMember(null); }}
        />
      )}
    </div>
  )
}