// src/pages/Orders.jsx
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useOrders, useCreateOrder } from '../hooks/useOrders'
import { useCustomers, useCreateCustomer } from '../hooks/useCustomers'
import { useAllStaff, useCreateStaff } from '../hooks/useStaff'
import { useCreateTransaction } from '../hooks/useTransactions'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardContent } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Trash2,
  Search,
  Package,
  User,
  Banknote,
  HandCoins,
  UserPlus,
  Sparkles,
  ChevronDown,
  Check,
  Printer,
  FileText,
  Image as ImageIcon,
  MessageSquare,
} from 'lucide-react'
import { formatCurrency, formatDate, getOrderStatus, isCashierOrAdmin } from '../lib/utils'
import { downloadOrderPDF, downloadOrderPNG, printOrderReceipt } from '../lib/pdf'
import { WhatsAppShareModal } from '../components/orders/WhatsAppShareModal'
import { useAuth } from '../context/AuthContext'

const itemSchema = z.object({
  item_name: z.string().min(1, 'Item name required'),
  quantity: z.coerce.number().positive('Must be positive'),
  unit_price: z.coerce.number().min(0, 'Price must be 0 or more'),
})

const orderSchema = z.object({
  customer_name: z.string().min(2, 'Please enter or select a customer name'),
  customer_phone: z.string().optional(),
  customer_id: z.string().optional(),
  employee_name: z.string().min(2, 'Please enter or select the staff member who worked on this client'),
  employee_id: z.string().optional(),
  cashier_id: z.string().optional(),
  initial_deposit: z.coerce.number().min(0).optional(),
  payment_method: z.enum(['cash', 'momo', 'airtel', 'bank', 'card', 'other']).default('cash'),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
})

function CreateOrderModal({ open, onClose }) {
  const toast = useToast()
  const navigate = useNavigate()
  const { user, activeCashierId } = useAuth()
  const { data: customers } = useCustomers('')
  const { data: staffList } = useAllStaff()
  const createCustomer = useCreateCustomer()
  const createStaff = useCreateStaff()
  const createOrder = useCreateOrder()
  const createTxn = useCreateTransaction()

  const allCustomers = customers || []
  const allStaff = (staffList || []).filter(s => s.active !== false)
  const cashierStaff = allStaff.filter(isCashierOrAdmin)
  const eligibleCashiers = cashierStaff.length > 0 ? cashierStaff : allStaff
  const adminStaff = eligibleCashiers.find(s => s.id === (activeCashierId || user?.id) || s.email === user?.email || s.role === 'super_admin' || s.role === 'admin')

  // Autocomplete dropdown states
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const [staffQuery, setStaffQuery] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [showStaffDropdown, setShowStaffDropdown] = useState(false)

  const customerDropdownRef = useRef(null)
  const staffDropdownRef = useRef(null)

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(orderSchema),
    values: {
      items: [{ item_name: '', quantity: 1, unit_price: 0 }],
      customer_name: customerQuery,
      customer_phone: customerPhone,
      customer_id: selectedCustomerId || '',
      employee_name: staffQuery,
      employee_id: selectedStaffId || '',
      cashier_id: activeCashierId || adminStaff?.id || user?.id || '',
      initial_deposit: 0,
      payment_method: 'cash',
      notes: '',
    },
  })

  useEffect(() => {
    function handleClickOutside(e) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setShowCustomerDropdown(false)
      }
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(e.target)) {
        setShowStaffDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCustomers = allCustomers.filter(c =>
    !customerQuery ||
    c.full_name?.toLowerCase().includes(customerQuery.toLowerCase()) ||
    c.phone?.toLowerCase().includes(customerQuery.toLowerCase())
  )

  const exactCustomerMatch = allCustomers.find(
    c => c.full_name?.toLowerCase().trim() === customerQuery.toLowerCase().trim()
  )

  const filteredStaff = allStaff.filter(s =>
    !staffQuery ||
    s.name?.toLowerCase().includes(staffQuery.toLowerCase()) ||
    s.role?.toLowerCase().includes(staffQuery.toLowerCase())
  )

  const exactStaffMatch = allStaff.find(
    s => s.name?.toLowerCase().trim() === staffQuery.toLowerCase().trim()
  )

  const handleSelectCustomer = (cust) => {
    setCustomerQuery(cust.full_name)
    setCustomerPhone(cust.phone || '')
    setSelectedCustomerId(cust.id)
    setValue('customer_name', cust.full_name)
    setValue('customer_phone', cust.phone || '')
    setValue('customer_id', cust.id)
    setShowCustomerDropdown(false)
  }

  const handleSelectStaff = (staff) => {
    setStaffQuery(staff.name)
    setSelectedStaffId(staff.id)
    setValue('employee_name', staff.name)
    setValue('employee_id', staff.id)
    setShowStaffDropdown(false)
  }

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')
  const watchedDeposit = Number(watch('initial_deposit') || 0)

  const total = (watchedItems || []).reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }, 0)

  const balance = Math.max(0, total - watchedDeposit)

  const onSubmit = async (data) => {
    try {
      // 1. Resolve Customer
      let resolvedCustomerId = selectedCustomerId || exactCustomerMatch?.id

      if (!resolvedCustomerId && data.customer_name?.trim()) {
        const newCust = await createCustomer.mutateAsync({
          full_name: data.customer_name.trim(),
          phone: data.customer_phone?.trim() || '—',
        })
        resolvedCustomerId = newCust.id
      }

      // 2. Resolve Staff
      let resolvedEmployeeId = selectedStaffId || exactStaffMatch?.id

      if (!resolvedEmployeeId && data.employee_name?.trim()) {
        const newStaff = await createStaff.mutateAsync({
          name: data.employee_name.trim(),
          role: 'employee',
          phone: '',
          active: true,
          verified: true,
          status: 'active',
        })
        resolvedEmployeeId = newStaff.id
      }

      // 3. Create Order
      const order = await createOrder.mutateAsync({
        order: {
          customer_id: resolvedCustomerId,
          employee_id: resolvedEmployeeId || null,
          cashier_id: data.cashier_id || adminStaff?.id || user?.id || null,
          total_amount: total,
          notes: data.notes || null,
        },
        items: data.items,
      })

      // 4. Record Deposit Transaction if collected
      if (data.initial_deposit && Number(data.initial_deposit) > 0) {
        try {
          await createTxn.mutateAsync({
            order_id: order.id,
            customer_id: resolvedCustomerId,
            employee_id: resolvedEmployeeId || null,
            cashier_id: data.cashier_id || adminStaff?.id || user?.id || null,
            type: 'deposit',
            amount: Number(data.initial_deposit),
            payment_method: data.payment_method || 'cash',
            notes: 'Initial deposit recorded during sale creation',
          })
        } catch (e) {
          console.warn('Could not record initial deposit transaction:', e)
        }
      }

      toast({ type: 'success', message: 'Order and sale recorded successfully!' })
      onClose()
      navigate(`/orders/${order.id}`)
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Failed to create order.' })
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record New Sale / Order" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Customer & Staff Auto-Creatable Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Input */}
          <div ref={customerDropdownRef} className="relative space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium" style={{ color: 'var(--fg)' }}>
                Customer Name *
              </label>
              {customerQuery.trim() && (
                <span className="text-[11px] font-medium flex items-center gap-1">
                  {selectedCustomerId || exactCustomerMatch ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <Check className="h-3 w-3" /> Existing Client
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <Sparkles className="h-3 w-3" /> New (Auto-save)
                    </span>
                  )}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Type customer name or search..."
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value)
                  setSelectedCustomerId(null)
                  setValue('customer_name', e.target.value)
                  setValue('customer_id', '')
                  setShowCustomerDropdown(true)
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--fg)',
                  borderColor: errors.customer_name ? '#ef4444' : 'var(--border)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowCustomerDropdown(prev => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs opacity-60 hover:opacity-100 p-1"
                style={{ color: 'var(--fg-muted)' }}
                tabIndex={-1}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {errors.customer_name && (
              <p className="text-xs text-red-500">{errors.customer_name.message}</p>
            )}

            {showCustomerDropdown && (
              <div
                className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border shadow-xl py-1 text-xs"
                style={{
                  background: 'var(--card)',
                  borderColor: 'var(--border-strong)',
                }}
              >
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(cust => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => handleSelectCustomer(cust)}
                      className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-purple-500/10 transition-colors"
                      style={{ color: 'var(--fg)' }}
                    >
                      <div>
                        <div className="font-semibold">{cust.full_name}</div>
                        <div className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{cust.phone || 'No phone'}</div>
                      </div>
                      {selectedCustomerId === cust.id && (
                        <Check className="h-4 w-4 text-emerald-500" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center" style={{ color: 'var(--fg-muted)' }}>
                    <p className="font-medium">No existing customer match</p>
                    <p className="text-[11px] mt-0.5 text-amber-500">
                      "{customerQuery}" will be automatically saved as a new customer
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-1">
              <input
                type="text"
                placeholder="Customer Phone Number (e.g. 0772 000 000)"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value)
                  setValue('customer_phone', e.target.value)
                }}
                className="w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-2"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--fg)',
                  borderColor: 'var(--border)',
                }}
              />
            </div>
          </div>

          {/* Staff Input */}
          <div ref={staffDropdownRef} className="relative space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium" style={{ color: 'var(--fg)' }}>
                Staff / Employee Attendant *
              </label>
              {staffQuery.trim() && (
                <span className="text-[11px] font-medium flex items-center gap-1">
                  {selectedStaffId || exactStaffMatch ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <Check className="h-3 w-3" /> Existing Staff
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <UserPlus className="h-3 w-3" /> New (Auto-add)
                    </span>
                  )}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Type staff name or select from roster..."
                value={staffQuery}
                onChange={(e) => {
                  setStaffQuery(e.target.value)
                  setSelectedStaffId(null)
                  setValue('employee_name', e.target.value)
                  setValue('employee_id', '')
                  setShowStaffDropdown(true)
                }}
                onFocus={() => setShowStaffDropdown(true)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--fg)',
                  borderColor: errors.employee_name ? '#ef4444' : 'var(--border)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowStaffDropdown(prev => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs opacity-60 hover:opacity-100 p-1"
                style={{ color: 'var(--fg-muted)' }}
                tabIndex={-1}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {errors.employee_name && (
              <p className="text-xs text-red-500">{errors.employee_name.message}</p>
            )}

            {showStaffDropdown && (
              <div
                className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border shadow-xl py-1 text-xs"
                style={{
                  background: 'var(--card)',
                  borderColor: 'var(--border-strong)',
                }}
              >
                {filteredStaff.length > 0 ? (
                  filteredStaff.map(st => {
                    const roleLabel = st.role === 'employee' ? 'Sales Rep' :
                      st.role === 'workshop' ? 'Workshop / Tailor' :
                      st.role === 'installer' ? 'Installer' :
                      st.role === 'both' ? 'Sales & Workshop' : st.role
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleSelectStaff(st)}
                        className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-purple-500/10 transition-colors"
                        style={{ color: 'var(--fg)' }}
                      >
                        <div>
                          <div className="font-semibold">{st.name}</div>
                          <div className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{roleLabel}</div>
                        </div>
                        {selectedStaffId === st.id && (
                          <Check className="h-4 w-4 text-emerald-500" />
                        )}
                      </button>
                    )
                  })
                ) : (
                  <div className="p-3 text-center" style={{ color: 'var(--fg-muted)' }}>
                    <p className="font-medium">New staff member</p>
                    <p className="text-[11px] mt-0.5 text-amber-500">
                      "{staffQuery}" will be automatically added to the staff roster
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
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
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase px-1" style={{ color: 'var(--fg-muted)' }}>
              <span className="col-span-6">Item Description</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-3 text-right">Unit Price (UGX)</span>
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
                      placeholder="e.g. Living room sheer curtains (meters)"
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
                      step="500"
                      placeholder="e.g. 45000"
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
        </div>

        {/* Financial & Deposit Collection Section */}
        <div
          className="p-4 rounded-xl border space-y-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--fg)' }}>
              <Banknote className="h-4 w-4 text-emerald-500" />
              Payment & Balance Summary
            </span>
            <span className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>
              Currency: UGX
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Deposit / Payment Collected Now"
              type="number"
              step="500"
              min="0"
              placeholder="0 (or amount paid now)"
              error={errors.initial_deposit?.message}
              {...register('initial_deposit')}
            />

            <Select label="Payment Method (Default: Cash)" {...register('payment_method')}>
              <option value="cash">Cash (Default)</option>
              <option value="momo">MTN Mobile Money</option>
              <option value="airtel">Airtel Money</option>
              <option value="bank">Bank Transfer</option>
              <option value="card">Card / POS</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <div className="pt-1">
            <Select label="Cashier Shift (Received By)" {...register('cashier_id')}>
              {eligibleCashiers.map(s => {
                const isCurrent = s.id === (activeCashierId || user?.id)
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role || 'Staff'}) {isCurrent ? '— Active Shift' : ''}
                  </option>
                )
              })}
              {!eligibleCashiers.some(s => s.id === (activeCashierId || user?.id)) && (
                <option value={activeCashierId || user?.id || ''}>
                  {user?.user_metadata?.full_name || 'Admin & Cashier'} (Active Shift)
                </option>
              )}
            </Select>
          </div>

          {/* Live Dynamic Balance Breakdown Card */}
          <div
            className="p-3.5 rounded-lg border grid grid-cols-3 gap-2 text-center"
            style={{ background: 'var(--surface-hover)', borderColor: 'var(--border)' }}
          >
            <div>
              <p className="text-[11px] font-medium uppercase" style={{ color: 'var(--fg-muted)' }}>Order Total</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--fg)' }}>{formatCurrency(total)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase" style={{ color: 'var(--fg-muted)' }}>Deposit Paid</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(watchedDeposit)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase" style={{ color: 'var(--fg-muted)' }}>Balance Remaining</p>
              <p className={`text-sm font-bold mt-0.5 ${balance > 0 ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>Order Notes / Instructions</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Measurements, color preferences, delivery instructions..."
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{
              background: 'var(--surface)',
              color: 'var(--fg)',
              borderColor: 'var(--border)'
            }}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting || createOrder.isPending}>
            Record Sale & Order
          </Button>
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
  const [whatsAppOrder, setWhatsAppOrder] = useState(null)
  const toast = useToast()

  const { data, isLoading } = useOrders({ status, page, perPage: 20 })
  const orders = data?.data || []
  const total = data?.count || 0

  const handlePrint = (order) => {
    try {
      printOrderReceipt({ order })
      toast({ type: 'success', message: 'Print window opened.' })
    } catch (err) {
      toast({ type: 'error', message: 'Print failed: ' + err.message })
    }
  }

  const handleDownloadPDF = (order) => {
    try {
      downloadOrderPDF({ order }, `order-ORD-${order.order_number || order.id?.slice(0, 6)}.pdf`)
      toast({ type: 'success', message: 'Order PDF downloaded!' })
    } catch (err) {
      toast({ type: 'error', message: 'PDF failed: ' + err.message })
    }
  }

  const handleDownloadPNG = (order) => {
    try {
      downloadOrderPNG({ order }, `order-ORD-${order.order_number || order.id?.slice(0, 6)}.png`)
      toast({ type: 'success', message: 'Order PNG downloaded!' })
    } catch (err) {
      toast({ type: 'error', message: 'PNG failed: ' + err.message })
    }
  }

  const filtered = search
    ? orders.filter(o =>
        o.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        String(o.order_number).includes(search) ||
        o.employee?.name?.toLowerCase().includes(search.toLowerCase()) ||
        o.order_items?.some(i => i.item_name?.toLowerCase().includes(search.toLowerCase()))
      )
    : orders

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>Orders & Sales</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            {total} total orders recorded
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/receive-payment">
            <Button variant="secondary">
              <HandCoins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Receive Payment
            </Button>
          </Link>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Record New Sale
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by customer, item, attending staff, or order #..."
            icon={<Search className="h-4 w-4" />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="w-40">
          <option value="">All statuses</option>
          <option value="pending">Pending / Partial</option>
          <option value="paid">Cleared</option>
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
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  className="border-b uppercase tracking-wider font-semibold text-[11px]"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--fg-muted)',
                  }}
                >
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Balance Owed</th>
                  <th className="py-3 px-4">Attending Staff</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {filtered.map(order => {
                  const statusInfo = getOrderStatus(order)

                  return (
                    <TrHover key={order.id}>
                      <td className="py-3.5 px-4 font-mono font-semibold" style={{ color: 'var(--fg)' }}>
                        ORD-{order.order_number}
                      </td>

                      <td className="py-3.5 px-4">
                        <Link to={`/orders/${order.id}`} className="font-semibold text-sm hover:underline" style={{ color: 'var(--brand)' }}>
                          {order.customer?.full_name || '—'}
                        </Link>
                        <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{order.customer?.phone || 'No phone'}</p>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-sm" style={{ color: 'var(--fg)' }}>
                        {formatCurrency(order.total_amount)}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(order.deposit)}
                      </td>

                      <td className={`py-3.5 px-4 font-bold text-sm ${Number(order.balance) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatCurrency(order.balance)}
                      </td>

                      <td className="py-3.5 px-4">
                        {order.employee ? (
                          <div className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--fg)' }}>
                            <User className="h-3.5 w-3.5 text-blue-500" />
                            <span>{order.employee.name}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--fg-muted)' }}>—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                          style={statusInfo.badgeStyle}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.isCleared ? 'bg-emerald-500' : statusInfo.percent > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>
                        {formatDate(order.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Share Button */}
                          <button
                            type="button"
                            onClick={() => setWhatsAppOrder(order)}
                            className="p-1.5 rounded-lg border hover:bg-emerald-500/10 transition-colors"
                            style={{ borderColor: 'var(--border)', color: '#16a34a' }}
                            title="Send Receipt to Customer's WhatsApp"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>

                          {/* Print Icon Button */}
                          <button
                            type="button"
                            onClick={() => handlePrint(order)}
                            className="p-1.5 rounded-lg border hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                            title="Print Voucher / Thermal Receipt"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          {/* PDF Download Button */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPDF(order)}
                            className="p-1.5 rounded-lg border hover:bg-purple-500/10 transition-colors"
                            style={{ borderColor: 'var(--border)', color: 'var(--brand)' }}
                            title="Download PDF"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>

                          {/* PNG Download Button */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPNG(order)}
                            className="p-1.5 rounded-lg border hover:bg-emerald-500/10 transition-colors"
                            style={{ borderColor: 'var(--border)', color: '#16a34a' }}
                            title="Download Image (PNG)"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                          </button>

                          <Link
                            to={`/orders/${order.id}`}
                            className="text-xs font-semibold hover:underline px-2 py-1 rounded-md border"
                            style={{
                              color: 'var(--brand)',
                              borderColor: 'var(--border)'
                            }}
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </TrHover>
                  )
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-40" style={{ color: 'var(--border-strong)' }} />
                      <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>No orders found</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                        {search ? 'No orders match your search criteria.' : 'Record your first sale by clicking "Record New Sale" above'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

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

      {whatsAppOrder && (
        <WhatsAppShareModal
          open={!!whatsAppOrder}
          onClose={() => setWhatsAppOrder(null)}
          orderData={{ order: whatsAppOrder }}
        />
      )}
    </div>
  )
}
