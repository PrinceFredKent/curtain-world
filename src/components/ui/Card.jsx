// src/components/ui/Card.jsx
import { cn } from '../../lib/utils'

export function Card({ children, className, ...props }) {
  return (
    <div
      className={cn('rounded-xl border shadow-sm', className)}
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
    <h3 className={cn('font-semibold', className)} style={{ color: 'var(--fg)' }}>
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
