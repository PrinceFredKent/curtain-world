// src/components/ui/Badge.jsx
import { cn } from '../../lib/utils'

const variants = {
  default:  'bg-[var(--surface-hover)]   text-[var(--fg-muted)]',
  green:    'bg-emerald-100  text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  yellow:   'bg-amber-100    text-amber-800   dark:bg-amber-900/40   dark:text-amber-300',
  red:      'bg-red-100      text-red-800     dark:bg-red-900/40     dark:text-red-300',
  blue:     'bg-sky-100      text-sky-800     dark:bg-sky-900/40     dark:text-sky-300',
  purple:   'bg-purple-100   text-purple-800  dark:bg-purple-900/40  dark:text-purple-300',
  navy:     'bg-[var(--brand)] text-[var(--brand-fg)]',
}

export function Badge({ children, variant = 'default', className }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      variants[variant] ?? variants.default,
      className
    )}>
      {children}
    </span>
  )
}
