'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader, type HeaderUser } from '@/components/AppHeader'

interface ManagedUser {
  id: number
  name: string
  email: string
  role: 'admin' | 'standard'
  created_at: string
}

export default function UsersPage() {
  const router = useRouter()
  const [me, setMe] = useState<HeaderUser | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Add-user form
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'standard'>('standard')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const authRes = await fetch('/api/auth')
        if (authRes.ok) {
          const authData = await authRes.json()
          if (authData.authenticated && authData.user) setMe(authData.user)
        }
        await loadUsers()
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadUsers = async () => {
    const res = await fetch('/api/users')
    if (res.status === 401 || res.status === 403) {
      router.push('/dashboard')
      return
    }
    const data = await res.json()
    setUsers(data.users || [])
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create user')
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewRole('standard')
      setShowAdd(false)
      await loadUsers()
      showToast('User created', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create user', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleRoleChange = async (u: ManagedUser, role: 'admin' | 'standard') => {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update role')
      await loadUsers()
      showToast('Role updated', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update role', 'error')
    }
  }

  const handleResetPassword = async (u: ManagedUser) => {
    const password = prompt(`New password for ${u.name} (min 8 characters):`)
    if (!password) return
    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'error')
      return
    }
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reset password')
      showToast('Password reset', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reset password', 'error')
    }
  }

  const handleDelete = async (u: ManagedUser) => {
    if (!confirm(`Delete user ${u.name}? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete user')
      await loadUsers()
      showToast('User deleted', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete user', 'error')
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={me}>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          {showAdd ? 'Cancel' : '+ Add User'}
        </button>
      </AppHeader>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg text-white ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">Manage who can access this app.</p>
        </div>

        {showAdd && (
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900">Add a new user</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={inputClass}
                placeholder="Name"
                autoComplete="off"
              />
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={inputClass}
                placeholder="Email"
                autoComplete="off"
              />
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                placeholder="Password (min 8 characters)"
                autoComplete="new-password"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'admin' | 'standard')}
                className={inputClass}
              >
                <option value="standard">Standard</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating…' : 'Create user'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => {
                  const isSelf = me?.id === u.id
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-700 font-medium">
                              {u.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {u.name}
                              {isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                            </p>
                            <p className="text-sm text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value as 'admin' | 'standard')}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="standard">Standard</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResetPassword(u)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Reset password
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={isSelf}
                            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={isSelf ? 'You cannot delete your own account' : 'Delete user'}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
