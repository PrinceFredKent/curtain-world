// src/pages/Orders.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useOrders, useCreateOrder } from '../hooks/useOrders'
import { useCustomers } from '../hooks/useCustomers'
import { useStaff } from '../hooks/useStaff'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Search, Package } from 'lucide-react'
import { formatCurrency, formatDate } from '../lib/utils'

const itemSchema = z.object({
  item_name: z.string().min(1, 'Item name required'),
  quantity: z.coerce.number().positive('Must be positive'),
  unit_price: z.coerce.number().min(0, 'Price must be 0 or more'),
})

const orderSchema = z.object({
  customer_id: z.string().min(1, 'Select a customer'),
  employee_id: z.string().optional(),
  cashier_id: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
})

function CreateOrderModal({ open, onClose }) {
  const toast = useToast()
  const navigate = useNavigate()
  const { data: customers } = useCustomers('')
  const { data: employees } = useStaff('employee')
  const { data: cashiers } = useStaff('cashier')
  const createOrder = useCreateOrder()

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: { items: [{ item_name: '', quantity: 1, unit_price: 0 }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')

  const total = (watchedItems || []).reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }, 0)

  const onSubmit = async (data) => {
    try {
      const order = await createOrder.mutateAsync({
        order: {
          customer_id: data.customer_id,
          employee_id: data.employee_id || null,
          cashier_id: data.cashier_id || null,
          total_amount: total,
          notes: data.notes || null,
        },
        items: data.items,
      })
      toast({ type: 'success', message: 'Order created!' })
      onClose()
      navigate(`/orders/${order.id}`)
    } catch (err) {
      toast({ type: 'error', message: err.message })
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Order" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Customer */}
        <Select label="Customer *" error={errors.customer_id?.message} {...register('customer_id')}>
          <option value="">— Select customer —</option>
          {(customers || []).map(c => (
            <option key={c.id} value={c.id}>{c.full_name} · {c.phone}</option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Select label="Employee" {...register('employee_id')}>
            <option value="">— None —</option>
            {(employees || []).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Select label="Cashier" {...register('cashier_id')}>
            <option value="">— None —</option>
            {(cashiers || []).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Order Items *</label>
            <button
              type="button"
              onClick={() => append({ item_name: '', quantity: 1, unit_price: 0 })}
              className="text-xs hover:underline font-medium flex items-center gap-1"
              style={{ color: 'var(--brand)' }}
            >
              <Plus className="h-3.5 w-3.5" /> Add Item
            </button>
          </div>
          {errors.items?.root && (
            <p className="text-xs text-red-500 mb-2">{errors.items.root.message}</p>
          )}

          <div className="space-y-2">
            {/* Headers */}
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase px-1" style={{ color: 'var(--fg-muted)' }}>
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-3 text-right">Unit Price</span>
              <span className="col-span-1" />
            </div>

            {fields.map((field, index) => {
              const qty = Number(watchedItems?.[index]?.quantity) || 0
              const price = Number(watchedItems?.[index]?.unit_price) || 0
              const sub = qty * price

              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-6">
                    <input
                      {...register(`items.${index}.item_name`)}
                      placeholder="Curtain item..."
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                      style={{
                        background: 'var(--surface)',
                        color: 'var(--fg)',
                        borderColor: 'var(--border)'
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      {...register(`items.${index}.quantity`)}
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="w-full rounded-lg border px-2 py-2 text-sm text-center focus:outline-none focus:ring-2"
                      style={{
                        background: 'var(--surface)',
                        color: 'var(--fg)',
                        borderColor: 'var(--border)'
                      }}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      {...register(`items.${index}.unit_price`)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full rounded-lg border px-2 py-2 text-sm text-right focus:outline-none focus:ring-2"
                      style={{
                        background: 'var(--surface)',
                        color: 'var(--fg)',
                        borderColor: 'var(--border)'
                      }}
                    />
                    <p className="text-right text-xs mt-0.5" style={{ color: 'var(--fg-subtle)' }}>{formatCurrency(sub)}</p>
                  </div>
                  <div className="col-span-1 flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="text-red-400 hover:text-red-600 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
            <span className="font-semibold" style={{ color: 'var(--fg)' }}>Order Total</span>
            <span className="text-xl font-bold" style={{ color: 'var(--brand)' }}>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Any special instructions..."
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{
              background: 'var(--surface)',
              color: 'var(--fg)',
              borderColor: 'var(--border)'
            }}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createOrder.isPending}>Create Order</Button>
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

export function Orders() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useOrders({ status, page, perPage: 20 })
  const orders = data?.data || []
  const total = data?.count || 0

  const statusBadge = (s) => {
    const map = {
      paid: { variant: 'green', label: 'Paid' },
      partial: { variant: 'yellow', label: 'Partial' },
      pending: { variant: 'red', label: 'Pending' },
      cancelled: { variant: 'default', label: 'Cancelled' },
    }
    const { variant, label } = map[s] || map.pending
    return <Badge variant={variant}>{label}</Badge>
  }

  const filtered = search
    ? orders.filter(o =>
        o.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        String(o.order_number).includes(search)
      )
    : orders

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Orders</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>{total} total orders</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Order
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by customer or order #..."
            icon={<Search className="h-4 w-4" />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="w-40">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <CardContent>
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 rounded-lg" style={{ background: 'var(--surface-hover)' }} />
              ))}
            </div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Order #', 'Customer', 'Total', 'Paid', 'Balance', 'Employee', 'Status', 'Date', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, idx) => (
                  <TrHover key={order.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                    <td className="px-4 py-3 text-sm font-mono font-semibold" style={{ color: 'var(--fg)' }}>
                      ORD-{order.order_number}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/orders/${order.id}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--brand)' }}>
                        {order.customer?.full_name || '—'}
                      </Link>
                      <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{order.customer?.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--fg)' }}>{formatCurrency(order.total_amount)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(order.deposit)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-amber-600 dark:text-amber-400">{formatCurrency(order.balance)}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--fg-muted)' }}>{order.employee?.name || '—'}</td>
                    <td className="px-4 py-3">{statusBadge(order.status)}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--fg-subtle)' }}>{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/orders/${order.id}`}
                        className="text-xs font-medium hover:underline"
                        style={{ color: 'var(--brand)' }}
                      >
                        View
                      </Link>
                    </td>
                  </TrHover>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center">
                      <Package className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--border-strong)' }} />
                      <p className="text-sm" style={{ color: 'var(--fg-subtle)' }}>No orders found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {total > 20 && (
          <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Page {page} of {Math.ceil(total / 20)}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Prev
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <CreateOrderModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
