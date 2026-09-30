// src/components/ui/Input.jsx
import { cn } from '../../lib/utils'
import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export const Input = forwardRef(function Input({ className, label, error, icon, type, ...props }, ref) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const computedType = isPassword ? (showPassword ? 'text' : 'password') : type

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
          type={computedType}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
            'placeholder:text-[var(--fg-subtle)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-[var(--brand)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            icon && 'pl-9',
            isPassword && 'pr-10',
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
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(prev => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--fg-muted)' }}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})

