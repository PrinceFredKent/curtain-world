// src/components/ui/Badge.jsx
import { cn } from '../../lib/utils'

const variants = {
  default:  'bg-[var(--surface-hover)] text-[var(--fg-muted)] border border-[var(--border)]',
  green:    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
  yellow:   'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
  amber:    'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
  red:      'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30',
  blue:     'bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30',
  sky:      'bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30',
  purple:   'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30',
  indigo:   'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30',
  orange:   'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30',
  rose:     'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30',
  cyan:     'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30',
  navy:     'bg-[var(--brand-light)] text-[var(--brand)] border border-[var(--brand)]/30',
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
