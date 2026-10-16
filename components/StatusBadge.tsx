'use client'

interface StatusBadgeProps {
  status: 'paid' | 'due' | 'overdue'
  variant?: 'default' | 'outline' | 'dot'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StatusBadge({
  status,
  variant = 'default',
  size = 'md',
  className = ''
}: StatusBadgeProps) {
  const getBadgeProps = (status: string) => {
    switch (status) {
      case 'overdue':
        return {
          bg: 'destructive',
          text: 'text-destructive-foreground',
          border: 'border-destructive',
          textContent: 'Overdue',
        }
      case 'due':
        return {
          bg: 'accent',
          text: 'text-accent-foreground',
          border: 'border-accent',
          textContent: 'Due',
        }
      case 'paid':
        return {
          bg: 'primary',
          text: 'text-primary-foreground',
          border: 'border-primary',
          textContent: 'Paid',
        }
      default:
        return {
          bg: 'secondary',
          text: 'text-muted-foreground',
          border: 'border-muted',
          textContent: 'Unknown',
        }
    }
  }

  const { bg, text, border, textContent } = getBadgeProps(status)

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  }[size]

  // Variant classes
  const variantClasses = variant === 'outline'
    ? 'bg-transparent border'
    : variant === 'dot'
      ? 'h-2.5 w-2.5 rounded-full'
      : 'bg-[hsl(var(--color-' + bg + ')/10)] border border-[hsl(var(--color-' + border + ')/20)]'

  return (
    <span
      className={`badge-premium inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 hover-lift ${sizeClasses} ${variantClasses} ${text} ${className}`}
    >
      {variant === 'dot' ? (
        <>
        </>
      ) : (
        textContent
      )}
    </span>
  )
}