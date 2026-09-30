// src/components/ui/Select.jsx
import { cn } from '../../lib/utils'
import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

export const Select = forwardRef(function Select({ className, label, error, children, ...props }, ref) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium" style={{ color: 'var(--fg)' }}>{label}</label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none rounded-lg border px-3 py-2 pr-8 text-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-[var(--brand)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-500',
            className
          )}
          style={{
            background: 'var(--surface)',
            color: 'var(--fg)',
            borderColor: error ? undefined : 'var(--border)',
          }}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
          style={{ color: 'var(--fg-subtle)' }}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})
