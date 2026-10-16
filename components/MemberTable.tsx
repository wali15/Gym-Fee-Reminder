'use client'

import { useState } from 'react'
import { StatusBadge } from './StatusBadge'

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

interface MemberTableProps {
  members: Member[]
  onRemind: (id: number) => Promise<void>
  onMarkPaid: (id: number) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onEdit: (member: Member) => void
  canDelete?: boolean
}

export function MemberTable({ members, onRemind, onMarkPaid, onDelete, onEdit, canDelete = true }: MemberTableProps) {
  const [remindingId, setRemindingId] = useState<number | null>(null)
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const getRowClass = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'border-l-4 border-destructive/50 bg-destructive/5'
      case 'due':
        return 'border-l-4 border-accent/50 bg-accent/5'
      case 'paid':
        return 'border-l-4 border-primary/50 bg-primary/5'
      default:
        return ''
    }
  }

  const formatCurrency = (amount: number) => {
    // For PKR, use "Rs." prefix instead of currency symbol
    return `Rs. ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleRemind = async (id: number) => {
    setRemindingId(id)
    try {
      await onRemind(id)
    } finally {
      setRemindingId(null)
    }
  }

  const handleMarkPaid = async (id: number) => {
    setMarkingPaidId(id)
    try {
      await onMarkPaid(id)
    } finally {
      setMarkingPaidId(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this member?')) return
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-6">
          <svg className="h-14 w-14 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="mb-2 text-title-sm font-semibold text-foreground">No members found</h3>
        <p className="text-muted-foreground/80 text-center max-w-md">
          Get started by adding your first member to the gym.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-premium">
        <thead>
          <tr>
            <th className="w-[30%]">Member</th>
            <th className="w-[20%]">Contact</th>
            <th className="w-[15%]">Fee</th>
            <th className="w-[15%]">Due Date</th>
            <th className="w-[10%]">Status</th>
            <th className="w-[10%]">Last Reminder</th>
            <th className="w-[15%]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {members.map((member) => (
            <tr
              key={member.id}
              className={`${getRowClass(member.status)} hover:bg-muted/5 transition-colors duration-200 hover-lift`}
            >
              <td className="table-premium py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/50">
                    <span className="text-primary-foreground font-medium">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground/60">{member.email?.split('@')[0] ?? ''}</p>
                  </div>
                </div>
              </td>
              <td className="table-premium py-4">
                <div className="text-sm text-foreground space-y-2">
                  {member.email && (
                    <div className="flex items-center gap-2 text-muted-foreground/80">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="whitespace-nowrap">{member.email}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground/80">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="whitespace-nowrap">{member.phone}</span>
                    </div>
                  )}
                  {!member.email && !member.phone && (
                    <span className="text-muted-foreground/50">No contact info</span>
                  )}
                </div>
              </td>
              <td className="table-premium py-4">
                <span className="text-base font-semibold text-foreground">{formatCurrency(member.fee_amount)}</span>
              </td>
              <td className="table-premium py-4">
                <span className="text-sm text-foreground">{formatDate(member.due_date)}</span>
              </td>
              <td className="table-premium py-4">
                <StatusBadge status={member.status} className="badge-premium-status" />
              </td>
              <td className="table-premium py-4">
                <span className="text-sm text-muted-foreground/60">
                  {member.last_reminder_sent
                    ? new Date(member.last_reminder_sent).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Never'}
                </span>
              </td>
              <td className="table-premium py-4">
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => handleRemind(member.id)}
                    disabled={remindingId === member.id || member.status === 'paid'}
                    className="p-2.5 text-primary hover:bg-primary/5 active:bg-primary/10 rounded-lg transition-all duration-200 hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send Reminder"
                    aria-label="Send reminder"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
                    </svg>
                  </button>

                  {member.status !== 'paid' && (
                    <button
                      onClick={() => handleMarkPaid(member.id)}
                      disabled={markingPaidId === member.id}
                      className="p-2.5 text-success hover:bg-success/5 active:bg-success/10 rounded-lg transition-all duration-200 hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Mark as Paid"
                      aria-label="Mark as paid"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}

                  <button
                    onClick={() => onEdit(member)}
                    className="p-2.5 text-muted-foreground/80 hover:bg-muted/5 hover:text-muted-foreground rounded-lg transition-all duration-200 hover-lift"
                    title="Edit"
                    aria-label="Edit member"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(member.id)}
                      disabled={deletingId === member.id}
                      className="p-2.5 text-destructive hover:bg-destructive/5 active:bg-destructive/10 rounded-lg transition-all duration-200 hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete"
                      aria-label="Delete member"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}