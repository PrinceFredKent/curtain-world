// src/components/ui/Input.jsx
import { cn } from '../../lib/utils'
import { forwardRef } from 'react'

export const Input = forwardRef(function Input({ className, label, error, icon, ...props }, ref) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium" style={{ color: 'var(--fg)' }}>{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-subtle)' }}>
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
            'placeholder:text-[var(--fg-subtle)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-[var(--brand)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            icon && 'pl-9',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          style={{
            background: 'var(--surface)',
            color: 'var(--fg)',
            borderColor: error ? undefined : 'var(--border)',
          }}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})
