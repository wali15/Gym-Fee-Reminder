'use client'

import { useEffect, useState, useCallback } from 'react'
import { MemberForm } from '@/components/MemberForm'
import { useRouter, useParams } from 'next/navigation'

interface Member {
  id: number
  name: string
  email: string
  phone: string
  fee_amount: number
  due_date: string
  status: 'paid' | 'due' | 'overdue'
}

export default function EditMemberPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMember = useCallback(async () => {
    try {
      const response = await fetch(`/api/members/${id}`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      const data = await response.json()
      setMember(data.member)
    } catch (error) {
      console.error('Failed to fetch member:', error)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchMember()
  }, [fetchMember])

  const handleSuccess = () => {
    router.push('/dashboard')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Member not found</p>
          <a href="/dashboard" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <a href="/dashboard" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </a>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Edit Member</h1>
          <p className="mt-2 text-gray-600">Update member details</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <MemberForm initialData={member} onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  )
}