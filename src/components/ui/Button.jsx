// src/components/ui/Button.jsx
import { useState, useCallback } from 'react'
import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--brand-fg)] shadow-sm active:shadow-none',
  secondary: [
    'bg-[var(--surface)] hover:bg-[var(--surface-hover)]',
    'text-[var(--fg)] border border-[var(--border)] shadow-sm active:shadow-none',
  ].join(' '),
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm active:shadow-none',
  ghost: 'hover:bg-[var(--surface-hover)] text-[var(--fg-muted)]',
  accent: 'bg-[var(--brand-light)] hover:bg-[var(--border-strong)] text-[var(--brand)] shadow-sm active:shadow-none',
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
  onClick,
  ...props
}) {
  const [ripples, setRipples] = useState([])

  const handleClick = useCallback((e) => {
    if (disabled || loading) return

    const rect = e.currentTarget.getBoundingClientRect()
    const sizePx = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - sizePx / 2
    const y = e.clientY - rect.top - sizePx / 2

    const newRipple = {
      x,
      y,
      size: sizePx,
      id: Date.now() + Math.random(),
    }

    setRipples((prev) => [...prev, newRipple])

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
    }, 600)

    if (onClick) onClick(e)
  }, [disabled, loading, onClick])

  const rippleColor = variant === 'primary' || variant === 'danger'
    ? 'rgba(255, 255, 255, 0.35)'
    : 'rgba(124, 58, 237, 0.25)'

  return (
    <button
      className={cn(
        'relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl font-medium cursor-pointer',
        'transition-all duration-200 active:scale-96',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: ripple.y,
            left: ripple.x,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: rippleColor,
            animation: 'water-ripple 600ms cubic-bezier(0.1, 0.8, 0.2, 1) forwards',
          }}
        />
      ))}
    </button>
  )
}
