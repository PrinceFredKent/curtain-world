// src/pages/OrderDetail.jsx
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useOrder } from '../hooks/useOrders'
import { useCreateTransaction, useDeleteTransaction } from '../hooks/useTransactions'
import { useStaff } from '../hooks/useStaff'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, Download, Trash2, DollarSign } from 'lucide-react'
import { formatCurrency, formatDateTime, formatDate, getPaymentMethodLabel } from '../lib/utils'
import { generateReceiptPDF, downloadPDF } from '../lib/pdf'

import { useAuth } from '../context/AuthContext'

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  type: z.enum(['deposit', 'payment']),
  payment_method: z.enum(['momo', 'airtel', 'cash', 'bank', 'card', 'other']),
  cashier_id: z.string().optional(),
  employee_id: z.string().optional(),
  notes: z.string().optional(),
})

function AddPaymentModal({ open, onClose, order, defaultType = 'payment' }) {
  const toast = useToast()
  const { user, fullName } = useAuth()
  const { data: cashiers } = useStaff('cashier')
  const { data: employees } = useStaff('employee')
  const createTxn = useCreateTransaction()

  const matchedCashier = cashiers?.find(c => c.id === user?.id || c.name === fullName)

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(paymentSchema),
    values: {
      type: defaultType,
      payment_method: 'momo',
      amount: order?.balance ?? '',
      cashier_id: matchedCashier?.id || order?.cashier_id || '',
      employee_id: order?.employee_id || '',
      notes: '',
    },
  })

  const onSubmit = async (data) => {
    try {
      const txn = await createTxn.mutateAsync({
        order_id: order.id,
        customer_id: order.customer_id,
        employee_id: data.employee_id || order.employee_id || null,
        cashier_id: data.cashier_id || order.cashier_id || null,
        type: data.type,
        amount: data.amount,
        payment_method: data.payment_method,
        notes: data.notes || null,
      })
      toast({ type: 'success', message: 'Payment recorded!' })
      reset()
      onClose(txn)
    } catch (err) {
      toast({ type: 'error', message: err.message })
    }
  }

  return (
    <Modal open={open} onClose={() => onClose(null)} title="Record Payment / Deposit" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Type *" {...register('type')}>
            <option value="deposit">Deposit</option>
            <option value="payment">Payment</option>
          </Select>
          <Select label="Payment Method *" {...register('payment_method')}>
            <option value="momo">MTN MoMo</option>
            <option value="airtel">Airtel Money</option>
            <option value="cash">Cash</option>
            <option value="bank">Bank Transfer</option>
            <option value="card">Card / POS</option>
            <option value="other">Other</option>
          </Select>
        </div>

        <Input
          label="Amount (UGX) *"
          type="number"
          step="500"
          min="500"
          placeholder="e.g. 500000"
          error={errors.amount?.message}
          {...register('amount')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select label="Employee" {...register('employee_id')}>
            <option value="">— Same as order —</option>
            {(employees || []).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Select label="Cashier" {...register('cashier_id')}>
            <option value="">— Same as order —</option>
            {(cashiers || []).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{
              background: 'var(--surface)',
              color: 'var(--fg)',
              borderColor: 'var(--border)'
            }}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => onClose(null)}>Cancel</Button>
          <Button type="submit" loading={createTxn.isPending}>Record Payment</Button>
        </div>
      </form>
    </Modal>
  )
}

function TrHover({ children, ...props }) {
  return (
    <tr
      {...props}
      className="transition-colors"
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </tr>
  )
}

export function OrderDetail() {
  const { id } = useParams()
  const { data: order, isLoading } = useOrder(id)
  const deleteTxn = useDeleteTransaction()
  const toast = useToast()
  const confirm = useConfirm()
  const [showPayment, setShowPayment] = useState(false)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 rounded w-48" style={{ background: 'var(--surface-hover)' }} />
        <div className="h-64 rounded-xl" style={{ background: 'var(--surface-hover)' }} />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--fg-subtle)' }}>Order not found</p>
        <Link to="/orders" className="text-sm mt-2 inline-block hover:underline" style={{ color: 'var(--brand)' }}>
          ← Back to orders
        </Link>
      </div>
    )
  }

  const handleDownloadReceipt = async (txn) => {
    try {
      const doc = generateReceiptPDF({
        transaction: txn,
        order,
        customer: order.customer,
        employee: txn.employee || order.employee,
        cashier: txn.cashier || order.cashier,
        items: order.order_items,
      })
      downloadPDF(doc, `receipt-${txn.id.slice(0, 8)}.pdf`)
      toast({ type: 'success', message: 'Receipt downloaded!' })
    } catch (err) {
      toast({ type: 'error', message: 'Failed to generate PDF: ' + err.message })
    }
  }

  const handleDeleteTxn = async (txn) => {
    const confirmed = await confirm({
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this payment record?',
      confirmText: 'Delete Payment',
      cancelText: 'Keep Record',
      variant: 'danger',
      itemDetails: {
        label: 'Payment Details',
        value: formatCurrency(txn.amount),
        subtext: `${getPaymentMethodLabel(txn.payment_method)} • ${formatDateTime(txn.created_at)}`,
        badge: txn.type?.toUpperCase() || 'PAYMENT',
      },
      warningNote: 'Deleting this transaction will automatically recalculate and increase the order unpaid balance.',
    })

    if (!confirmed) return

    try {
      await deleteTxn.mutateAsync(txn.id)
      toast({ type: 'success', message: 'Transaction deleted and balance updated' })
    } catch (err) {
      toast({ type: 'error', message: err.message })
    }
  }

  const statusInfo = {
    paid: { variant: 'green', label: 'Paid' },
    partial: { variant: 'yellow', label: 'Partial' },
    pending: { variant: 'red', label: 'Pending' },
    cancelled: { variant: 'default', label: 'Cancelled' },
  }
  const { variant: statusVariant, label: statusLabel } = statusInfo[order.status] || statusInfo.pending

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/orders" className="text-sm flex items-center gap-1 mb-2 hover:underline" style={{ color: 'var(--fg-muted)' }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>ORD-{order.order_number}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Created {formatDate(order.created_at)}</p>
        </div>
        <Badge variant={statusVariant} className="text-sm px-3 py-1">{statusLabel}</Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Order Total', value: formatCurrency(order.total_amount), color: 'var(--fg)' },
          { label: 'Total Paid', value: formatCurrency(order.deposit), color: 'var(--success)' },
          { label: 'Balance Owed', value: formatCurrency(order.balance), color: order.balance > 0 ? 'var(--warning)' : 'var(--success)' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="py-4">
              <p className="text-xs uppercase font-semibold" style={{ color: 'var(--fg-muted)' }}>{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Customer & Staff */}
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase" style={{ color: 'var(--fg-muted)' }}>Customer</p>
              <p className="font-medium mt-0.5" style={{ color: 'var(--fg)' }}>{order.customer?.full_name}</p>
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{order.customer?.phone}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase" style={{ color: 'var(--fg-muted)' }}>Employee</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--fg)' }}>{order.employee?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase" style={{ color: 'var(--fg-muted)' }}>Cashier</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--fg)' }}>{order.cashier?.name || '—'}</p>
              </div>
            </div>
            {order.notes && (
              <div>
                <p className="text-xs font-semibold uppercase" style={{ color: 'var(--fg-muted)' }}>Notes</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--fg)' }}>{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="px-4 py-2 text-left text-xs uppercase" style={{ color: 'var(--fg-muted)' }}>Item</th>
                  <th className="px-4 py-2 text-center text-xs uppercase" style={{ color: 'var(--fg-muted)' }}>Qty</th>
                  <th className="px-4 py-2 text-right text-xs uppercase" style={{ color: 'var(--fg-muted)' }}>Price</th>
                  <th className="px-4 py-2 text-right text-xs uppercase" style={{ color: 'var(--fg-muted)' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(order.order_items || []).map((item, idx) => (
                  <tr key={item.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                    <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--fg)' }}>{item.item_name}</td>
                    <td className="px-4 py-2.5 text-sm text-center" style={{ color: 'var(--fg-muted)' }}>{item.quantity}</td>
                    <td className="px-4 py-2.5 text-sm text-right" style={{ color: 'var(--fg-muted)' }}>{formatCurrency(item.unit_price)}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-right" style={{ color: 'var(--fg)' }}>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface-hover)' }}>
                  <td colSpan={3} className="px-4 py-2.5 text-sm font-bold text-right" style={{ color: 'var(--fg)' }}>Total</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-right" style={{ color: 'var(--brand)' }}>
                    {formatCurrency(order.total_amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <Button size="sm" onClick={() => setShowPayment(true)}>
            <Plus className="h-4 w-4" /> Add Payment
          </Button>
        </CardHeader>
        {(order.transactions || []).length === 0 ? (
          <CardContent>
            <div className="py-8 text-center">
              <DollarSign className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--border-strong)' }} />
              <p className="text-sm" style={{ color: 'var(--fg-subtle)' }}>No payments recorded yet</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => setShowPayment(true)}>
                Record first payment
              </Button>
            </div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Type', 'Amount', 'Method', 'Cashier', 'Notes', ''].map((h, i) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--fg-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(order.transactions || []).map((txn, idx) => (
                  <TrHover key={txn.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>{formatDateTime(txn.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={txn.type === 'deposit' ? 'purple' : 'green'}>
                        {txn.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(txn.amount)}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--fg-muted)' }}>{getPaymentMethodLabel(txn.payment_method)}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--fg-muted)' }}>{txn.cashier?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--fg-subtle)' }}>{txn.notes || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDownloadReceipt(txn)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--brand)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-light)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          title="Download receipt"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTxn(txn)}
                          className="p-1.5 rounded-lg transition-colors text-red-500"
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </TrHover>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddPaymentModal
        open={showPayment}
        onClose={(txn) => {
          setShowPayment(false)
          if (txn) handleDownloadReceipt(txn)
        }}
        order={order}
      />
    </div>
  )
}
