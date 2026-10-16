'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface MemberFormProps {
  initialData?: {
    id?: number
    name: string
    email: string | null
    phone: string | null
    fee_amount: number
    due_date: string
    status: 'paid' | 'due' | 'overdue'
  }
  onSuccess?: () => void
}

export function MemberForm({ initialData, onSuccess }: MemberFormProps) {
  const router = useRouter()
  const isEditing = !!initialData?.id
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    fee_amount: initialData?.fee_amount || '',
    due_date: initialData?.due_date || new Date().toISOString().split('T')[0],
    status: initialData?.status || 'due',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = 'Member name is required'
    }

    if (!formData.fee_amount || parseFloat(String(formData.fee_amount)) <= 0) {
      errors.fee_amount = 'Please enter a valid fee amount'
    }

    if (!formData.due_date) {
      errors.due_date = 'Due date is required'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const url = isEditing
        ? `/api/members/${initialData!.id}`
        : `/api/members`
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email || null,
          phone: formData.phone || null,
          fee_amount: Number(formData.fee_amount),
          due_date: formData.due_date,
          status: formData.status,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save member')
      }

      onSuccess?.()
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-8">
        <div>
          <label htmlFor="name" className="form-label">
            Member Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className={`input-premium w-full ${fieldErrors.name ? 'border-destructive/50' : ''}`}
            placeholder="John Doe"
          />
          {fieldErrors.name && (
            <p className="form-error">{fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`input-premium w-full ${fieldErrors.email ? 'border-destructive/50' : ''}`}
            placeholder="john@example.com"
          />
          {fieldErrors.email && (
            <p className="form-error">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="form-label">
            Phone (WhatsApp)
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={`input-premium w-full ${fieldErrors.phone ? 'border-destructive/50' : ''}`}
            placeholder="+91 98765 43210"
          />
          {fieldErrors.phone && (
            <p className="form-error">{fieldErrors.phone}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="fee_amount" className="form-label">
              Fee Amount (₹) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              id="fee_amount"
              name="fee_amount"
              value={formData.fee_amount}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className={`input-premium w-full ${fieldErrors.fee_amount ? 'border-destructive/50' : ''}`}
              placeholder="1500"
            />
            {fieldErrors.fee_amount && (
              <p className="form-error">{fieldErrors.fee_amount}</p>
            )}
          </div>

          <div>
            <label htmlFor="due_date" className="form-label">
              Due Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              id="due_date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              required
              className={`input-premium w-full ${fieldErrors.due_date ? 'border-destructive/50' : ''}`}
            />
            {fieldErrors.due_date && (
              <p className="form-error">{fieldErrors.due_date}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="status" className="form-label">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="select-premium w-full"
          >
            <option value="due">Due</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 pt-6 border-t border-border/50">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 btn-premium btn-premium-primary hover-lift transition-all duration-200"
        >
          {loading ? 'Saving...' : isEditing ? 'Update Member' : 'Add Member'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 btn-premium btn-premium-outline hover-lift transition-all duration-200"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}