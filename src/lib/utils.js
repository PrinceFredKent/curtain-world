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
  try {
    return format(new Date(date), 'dd MMM yyyy')
  } catch {
    return '—'
  }
}

export function formatDateTime(date) {
  if (!date) return '—'
  try {
    return format(new Date(date), 'dd MMM yyyy, HH:mm')
  } catch {
    return '—'
  }
}

export function getDateRange(period) {
  const now = new Date()
  switch (period) {
    case 'all':
      return { from: null, to: null }
    case 'day':
      return { from: startOfDay(now), to: endOfDay(now) }
    case 'week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'year':
      return { from: startOfYear(now), to: endOfYear(now) }
    default:
      return { from: null, to: null }
  }
}

export function getPaymentMethodLabel(method) {
  const map = {
    cash: 'Cash',
    momo: 'MTN MoMo',
    airtel: 'Airtel Money',
    bank: 'Bank Transfer',
    card: 'Card / POS',
    other: 'Other',
    transfer: 'Bank Transfer',
  }
  return map[method?.toLowerCase()] || method || 'Cash'
}

/**
 * Computes order payment status:
 * - "Cleared" when fully paid (balance <= 0)
 * - "X% Paid" (e.g. "0% Paid", "50% Paid", "75% Paid") when partial or pending
 */
export function getOrderStatus(order) {
  const total = Number(order?.total_amount) || 0
  const deposit = Number(order?.deposit) || 0
  const balance = Number(order?.balance ?? Math.max(0, total - deposit))

  if (total <= 0) {
    return {
      status: 'cleared',
      label: 'Cleared',
      percent: 100,
      variant: 'green',
      isCleared: true,
      badgeStyle: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        color: '#16a34a',
        borderColor: 'rgba(34, 197, 94, 0.3)',
      },
    }
  }

  const percent = Math.min(100, Math.max(0, Math.round((deposit / total) * 100)))

  if (balance <= 0 || percent >= 100 || order?.status === 'paid') {
    return {
      status: 'cleared',
      label: 'Cleared',
      percent: 100,
      variant: 'green',
      isCleared: true,
      badgeStyle: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        color: '#16a34a',
        borderColor: 'rgba(34, 197, 94, 0.3)',
      },
    }
  }

  if (percent > 0) {
    return {
      status: 'partial',
      label: `${percent}% Paid`,
      percent,
      variant: 'yellow',
      isCleared: false,
      badgeStyle: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        color: '#d97706',
        borderColor: 'rgba(245, 158, 11, 0.3)',
      },
    }
  }

  return {
    status: 'pending',
    label: '0% Paid',
    percent: 0,
    variant: 'red',
    isCleared: false,
    badgeStyle: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      color: '#dc2626',
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
  }
}

/**
 * Checks if a staff member or role is eligible to receive, record, or edit payments
 * (Mandatory roles: 'super_admin', 'admin', 'cashier', 'employee' (sales), or 'both')
 */
export function canHandlePayments(staffOrRole) {
  if (!staffOrRole) return false
  const role = typeof staffOrRole === 'string'
    ? staffOrRole.toLowerCase().trim()
    : (staffOrRole.role || '').toLowerCase().trim()
  const email = typeof staffOrRole === 'object'
    ? (staffOrRole.email || '').toLowerCase().trim()
    : ''

  if (email === 'sharityra41@gmail.com') return true

  return ['super_admin', 'admin', 'cashier', 'employee', 'both'].includes(role)
}

/**
 * Checks if a staff member is eligible to act as cashier / operate register
 */
export function isCashierOrAdmin(staff) {
  return canHandlePayments(staff)
}

/**
 * Checks if a staff member has active PIN protection
 */
export function isPinProtected(staff) {
  if (!staff) return false
  const pin = String(staff.pin_code || '').trim()
  return pin.length >= 4
}

