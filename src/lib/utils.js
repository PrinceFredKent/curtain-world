// src/lib/utils.js
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount) {
  const val = Math.round(Number(amount) || 0)
  return `UGX ${new Intl.NumberFormat('en-UG').format(val)}`
}

export function formatCompactUGX(amount) {
  const val = Number(amount) || 0
  if (val >= 1_000_000) {
    const m = (val / 1_000_000).toFixed(1)
    return `${m.endsWith('.0') ? m.slice(0, -2) : m}M`
  }
  if (val >= 1_000) return `${Math.round(val / 1_000)}k`
  return `${val}`
}

export function formatDate(date) {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy')
}

export function formatDateTime(date) {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy, HH:mm')
}

export function getDateRange(period) {
  const now = new Date()
  switch (period) {
    case 'day':
      return { from: startOfDay(now), to: endOfDay(now) }
    case 'week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'year':
      return { from: startOfYear(now), to: endOfYear(now) }
    default:
      return { from: startOfDay(now), to: endOfDay(now) }
  }
}

export function getPaymentMethodLabel(method) {
  const map = {
    momo: 'MTN MoMo',
    airtel: 'Airtel Money',
    cash: 'Cash',
    bank: 'Bank Transfer',
    card: 'Card / POS',
    other: 'Other',
    transfer: 'Bank Transfer',
  }
  return map[method?.toLowerCase()] || method || 'Cash'
}
