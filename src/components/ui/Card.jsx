// src/components/ui/Card.jsx
import { cn } from '../../lib/utils'

export function Card({ children, className, hoverEffect = false, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border shadow-sm transition-all duration-300 ease-out',
        hoverEffect && 'hover:shadow-lg hover:-translate-y-0.5 hover:border-[var(--brand)]/30',
        className
      )}
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return (
    <div
      className={cn('px-5 py-4 flex items-center justify-between border-b', className)}
      style={{ borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={cn('font-semibold tracking-tight', className)} style={{ color: 'var(--fg)' }}>
      {children}
    </h3>
  )
}

export function CardContent({ children, className }) {
  return (
    <div className={cn('px-5 py-4', className)}>
      {children}
    </div>
  )
}
