'use client'

interface StatusBadgeProps {
  status: 'paid' | 'due' | 'overdue'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    paid: 'bg-green-100 text-green-800 border-green-200',
    due: 'bg-amber-100 text-amber-800 border-amber-200',
    overdue: 'bg-red-100 text-red-800 border-red-200',
  }

  const icons = {
    paid: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    due: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    overdue: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  }

  const labels = {
    paid: 'Paid',
    due: 'Due Soon',
    overdue: 'Overdue',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}>
      {icons[status]}
      {labels[status]}
    </span>
  )
}