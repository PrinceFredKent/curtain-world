// src/components/ui/Button.jsx
import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--brand-fg)] shadow-sm',
  secondary: [
    'bg-[var(--surface)] hover:bg-[var(--surface-hover)]',
    'text-[var(--fg)] border border-[var(--border)] shadow-sm',
  ].join(' '),
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  ghost: 'hover:bg-[var(--surface-hover)] text-[var(--fg-muted)]',
  accent: 'bg-[var(--brand-light)] hover:bg-[var(--border-strong)] text-[var(--brand)] shadow-sm',
}

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-9 w-9',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  loading = false,
  disabled,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
