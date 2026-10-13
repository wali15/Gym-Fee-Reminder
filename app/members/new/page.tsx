'use client'

import { MemberForm } from '@/components/MemberForm'
import { useRouter } from 'next/navigation'

export default function NewMemberPage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/dashboard')
    router.refresh()
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
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Add New Member</h1>
          <p className="mt-2 text-gray-600">Enter member details to add them to the system</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <MemberForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  )
}