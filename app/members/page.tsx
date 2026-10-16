'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Member } from '@/lib/db'

export default function MembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/members')

      if (res.status === 401) {
        router.push('/login')
        return
      }

      if (!res.ok) {
        throw new Error('Failed to fetch members')
      }

      const data = await res.json()
      setMembers(data.members || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this member?')) {
      return
    }

    try {
      const res = await fetch(`/api/members/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete member')
      }

      // Remove deleted member from list
      setMembers(prev => prev.filter(member => member.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete member')
    }
  }

  const handleMarkPaid = async (id: number) => {
    try {
      const res = await fetch(`/api/members?id=${id}&action=paid`, {
        method: 'PATCH',
      })

      if (!res.ok) {
        throw new Error('Failed to update member status')
      }

      // Update member status in list
      setMembers(prev =>
        prev.map(member =>
          member.id === id ? { ...member, status: 'paid' } : member
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <a href="/dashboard" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <a href="/members/new" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Member
          </a>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Members</h1>
          <p className="mt-2 text-gray-600">Manage your gym members and track payment status</p>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No members found. Add your first member to get started.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{members.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-sm font-medium text-muted-foreground">Due Soon</p>
                <p className="mt-2 text-2xl font-bold text-primary-600">
                  {members.filter(m => m.status === 'due').length}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="mt-2 text-2xl font-bold text-destructive">
                  {members.filter(m => m.status === 'overdue').length}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-sm font-medium text-muted-foreground">Paid</p>
                <p className="mt-2 text-2xl font-bold text-success-600">
                  {members.filter(m => m.status === 'paid').length}
                </p>
              </div>
            </div>

            {/* Members Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fee Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {members.map(member => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {member.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.phone || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{member.fee_amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(member.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(member.status)}`}>
                            {capitalizeStatus(member.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                          {member.status !== 'paid' && (
                            <button
                              onClick={() => handleMarkPaid(member.id)}
                              className="text-primary-600 hover:text-primary-700"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="text-destructive hover:text-destructive-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper functions
function getStatusClass(status: 'paid' | 'due' | 'overdue'): string {
  switch (status) {
    case 'paid': return 'bg-success-100 text-success-800'
    case 'due': return 'bg-primary-100 text-primary-800'
    case 'overdue': return 'bg-destructive-100 text-destructive-800'
    default: return 'bg-muted-100 text-muted-800'
  }
}

function capitalizeStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}