// src/lib/utils.js
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount ?? 0)
}

export function formatDate(date) {
  return format(new Date(date), 'MMM dd, yyyy')
}

export function formatDateTime(date) {
  return format(new Date(date), 'MMM dd, yyyy HH:mm')
}

export function getDateRange(period) {
  const now = new Date()
  switch (period) {
    case 'day':
      return { from: startOfDay(now), to: endOfDay(now) }
    case 'week':
      return { from: startOfWeek(now, { weekStartsOn: 0 }), to: endOfWeek(now, { weekStartsOn: 0 }) }
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'year':
      return { from: startOfYear(now), to: endOfYear(now) }
    default:
      return { from: startOfDay(now), to: endOfDay(now) }
  }
}

export function getStatusColor(status) {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-800'
    case 'partial': return 'bg-yellow-100 text-yellow-800'
    case 'pending': return 'bg-red-100 text-red-800'
    case 'cancelled': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-600'
  }
}
