// src/pages/ReceivePayment.jsx
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { useOrders } from '../hooks/useOrders'
import { useAllStaff } from '../hooks/useStaff'
import { useCreateTransaction } from '../hooks/useTransactions'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getOrderStatus,
  getPaymentMethodLabel
} from '../lib/utils'
import {
  generateReceiptPDF,
  downloadPDF,
  downloadOrderPNG,
  printOrderReceipt
} from '../lib/pdf'
import {
  HandCoins,
  Search,
  Check,
  ChevronDown,
  User,
  ShoppingBag,
  Banknote,
  CheckCircle2,
  Printer,
  FileText,
  Image as ImageIcon,
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react'

export function ReceivePayment() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user, fullName } = useAuth()

  const urlCustomerId = searchParams.get('customerId')
  const urlOrderId = searchParams.get('orderId')

  const { data: customers } = useCustomers('')
  const { data: allStaffList } = useAllStaff()
  const { data: ordersData, isLoading: ordersLoading } = useOrders({ perPage: 100 })
  const createTxn = useCreateTransaction()

  const allCustomers = customers || []
  const allOrders = ordersData?.data || []
  const activeStaff = (allStaffList || []).filter(s => s.active !== false)
  const adminStaff = activeStaff.find(s => s.id === user?.id || s.email === user?.email || s.role === 'super_admin' || s.role === 'admin')

  // Customer Autocomplete States
  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const customerDropdownRef = useRef(null)

  // Payment Form States
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentType, setPaymentType] = useState('payment')
  const [employeeId, setEmployeeId] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completedTxn, setCompletedTxn] = useState(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle URL query parameters if present
  useEffect(() => {
    if (urlCustomerId && allCustomers.length > 0) {
      const matched = allCustomers.find(c => c.id === urlCustomerId)
      if (matched) {
        setSelectedCustomerId(matched.id)
        setCustomerQuery(matched.full_name)
      }
    }
  }, [urlCustomerId, allCustomers])

  // Get orders belonging to the selected customer
  const customerOrders = selectedCustomerId
    ? allOrders.filter(o => o.customer_id === selectedCustomerId)
    : []

  const pendingCustomerOrders = customerOrders.filter(o => {
    const bal = Number(o.balance ?? (Number(o.total_amount) - Number(o.deposit || 0)))
    return bal > 0
  })

  const totalOutstanding = customerOrders.reduce((sum, o) => {
    const bal = Number(o.balance ?? (Number(o.total_amount) - Number(o.deposit || 0)))
    return sum + Math.max(0, bal)
  }, 0)

  // Auto-select order if provided in URL or if only one pending order exists
  useEffect(() => {
    if (urlOrderId && customerOrders.length > 0) {
      const match = customerOrders.find(o => o.id === urlOrderId)
      if (match) {
        setSelectedOrderId(match.id)
        setAmount(String(match.balance || ''))
        setEmployeeId(match.employee_id || '')
        return
      }
    }

    if (pendingCustomerOrders.length === 1 && !selectedOrderId) {
      const single = pendingCustomerOrders[0]
      setSelectedOrderId(single.id)
      setAmount(String(single.balance || ''))
      setEmployeeId(single.employee_id || '')
    }
  }, [selectedCustomerId, customerOrders, urlOrderId])

  // Filtered customer suggestions
  const filteredCustomers = allCustomers.filter(c =>
    !customerQuery ||
    c.full_name?.toLowerCase().includes(customerQuery.toLowerCase()) ||
    c.phone?.toLowerCase().includes(customerQuery.toLowerCase())
  )

  const handleSelectCustomer = (cust) => {
    setSelectedCustomerId(cust.id)
    setCustomerQuery(cust.full_name)
    setShowCustomerDropdown(false)
    setSelectedOrderId(null)
    setAmount('')
    setCompletedTxn(null)
  }

  const handleSelectOrder = (order) => {
    setSelectedOrderId(order.id)
    const bal = Number(order.balance ?? (Number(order.total_amount) - Number(order.deposit || 0)))
    setAmount(String(bal > 0 ? bal : ''))
    setEmployeeId(order.employee_id || '')
  }

  const selectedOrder = customerOrders.find(o => o.id === selectedOrderId)
  const currentOrderBalance = selectedOrder
    ? Number(selectedOrder.balance ?? (Number(selectedOrder.total_amount) - Number(selectedOrder.deposit || 0)))
    : 0

  const numericAmount = Number(amount) || 0
  const newRemainingBalance = Math.max(0, currentOrderBalance - numericAmount)

  const handleSubmitPayment = async (e) => {
    e.preventDefault()
    if (!selectedCustomerId) {
      toast({ type: 'error', message: 'Please select a customer first.' })
      return
    }
    if (!selectedOrderId) {
      toast({ type: 'error', message: 'Please select an order to apply the payment to.' })
      return
    }
    if (!numericAmount || numericAmount <= 0) {
      toast({ type: 'error', message: 'Please enter a valid payment amount.' })
      return
    }

    setSubmitting(true)
    try {
      const txn = await createTxn.mutateAsync({
        order_id: selectedOrderId,
        customer_id: selectedCustomerId,
        employee_id: employeeId || selectedOrder?.employee_id || null,
        cashier_id: adminStaff?.id || user?.id || null,
        type: paymentType,
        amount: numericAmount,
        payment_method: paymentMethod || 'cash',
        notes: notes || `Payment received via ${getPaymentMethodLabel(paymentMethod)}`,
      })

      toast({ type: 'success', message: 'Payment recorded and balance updated!' })
      setCompletedTxn({
        ...txn,
        order: selectedOrder,
        customer: allCustomers.find(c => c.id === selectedCustomerId),
        employee: activeStaff.find(s => s.id === (employeeId || selectedOrder?.employee_id)),
        cashier: adminStaff || { name: fullName || 'Admin & Cashier' },
      })
    } catch (err) {
      toast({ type: 'error', message: err.message || 'Failed to record payment.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrintReceipt = () => {
    if (!completedTxn) return
    printOrderReceipt({
      order: completedTxn.order,
      customer: completedTxn.customer,
      employee: completedTxn.employee,
      cashier: completedTxn.cashier,
      items: completedTxn.order?.order_items || [],
    })
  }

  const handleDownloadPDF = () => {
    if (!completedTxn) return
    const doc = generateReceiptPDF({
      transaction: completedTxn,
      order: completedTxn.order,
      customer: completedTxn.customer,
      employee: completedTxn.employee,
      cashier: completedTxn.cashier,
      items: completedTxn.order?.order_items || [],
    })
    downloadPDF(doc, `receipt-${completedTxn.id?.slice(0, 8) || 'payment'}.pdf`)
    toast({ type: 'success', message: 'Receipt PDF downloaded!' })
  }

  const handleDownloadPNG = () => {
    if (!completedTxn) return
    downloadOrderPNG({
      order: completedTxn.order,
      customer: completedTxn.customer,
      employee: completedTxn.employee,
      cashier: completedTxn.cashier,
      items: completedTxn.order?.order_items || [],
    }, `receipt-${completedTxn.id?.slice(0, 8) || 'payment'}.png`)
    toast({ type: 'success', message: 'Receipt image downloaded!' })
  }

  const handleResetForAnother = () => {
    setCompletedTxn(null)
    setAmount('')
    setNotes('')
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5" style={{ color: 'var(--fg)' }}>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <HandCoins className="h-6 w-6" />
            </div>
            Receive Payment / Clear Balance
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Search a customer, view their pending sales balance, and collect payments on the spot
          </p>
        </div>

        <Link to="/orders">
          <Button variant="secondary" size="sm">
            <ShoppingBag className="h-4 w-4" /> View All Orders
          </Button>
        </Link>
      </div>

      {/* Success Receipt State after Recording Payment */}
      {completedTxn ? (
        <Card className="border-emerald-500/30 overflow-hidden shadow-lg">
          <div className="p-6 text-center space-y-4" style={{ background: 'var(--surface)' }}>
            <div className="h-16 w-16 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
                Payment Received Successfully!
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                Recorded {formatCurrency(completedTxn.amount)} via {getPaymentMethodLabel(completedTxn.payment_method)}
              </p>
            </div>

            {/* Receipt Summary Grid */}
            <div
              className="p-4 rounded-xl border max-w-md mx-auto grid grid-cols-2 gap-3 text-left text-xs"
              style={{ background: 'var(--surface-hover)', borderColor: 'var(--border)' }}
            >
              <div>
                <span style={{ color: 'var(--fg-muted)' }}>Customer:</span>
                <p className="font-bold text-sm mt-0.5" style={{ color: 'var(--fg)' }}>
                  {completedTxn.customer?.full_name}
                </p>
              </div>
              <div>
                <span style={{ color: 'var(--fg-muted)' }}>Order Number:</span>
                <p className="font-mono font-bold text-sm mt-0.5" style={{ color: 'var(--brand)' }}>
                  ORD-{completedTxn.order?.order_number}
                </p>
              </div>
              <div>
                <span style={{ color: 'var(--fg-muted)' }}>Amount Paid:</span>
                <p className="font-bold text-base text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(completedTxn.amount)}
                </p>
              </div>
              <div>
                <span style={{ color: 'var(--fg-muted)' }}>Remaining Balance:</span>
                <p className={`font-bold text-base mt-0.5 ${newRemainingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatCurrency(newRemainingBalance)}
                </p>
              </div>
            </div>

            {/* Print & Download Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button onClick={handlePrintReceipt}>
                <Printer className="h-4 w-4" /> Print Receipt (58mm)
              </Button>
              <Button variant="secondary" onClick={handleDownloadPDF}>
                <FileText className="h-4 w-4" /> Download PDF
              </Button>
              <Button variant="secondary" onClick={handleDownloadPNG}>
                <ImageIcon className="h-4 w-4" /> Download Image (PNG)
              </Button>
            </div>

            <div className="pt-4 border-t flex justify-center gap-4 text-xs" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={handleResetForAnother}
                className="font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                + Receive another payment for this customer
              </button>
              <span style={{ color: 'var(--border-strong)' }}>•</span>
              <Link
                to={`/orders/${completedTxn.order_id}`}
                className="font-semibold text-gray-500 hover:underline"
              >
                View Full Order Details
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Step 1: Customer Selection */}
          <Card style={{ borderColor: 'var(--border)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-500" />
                  1. Select Customer
                </span>
                {selectedCustomerId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(null)
                      setCustomerQuery('')
                      setSelectedOrderId(null)
                    }}
                    className="text-xs text-purple-500 hover:underline"
                  >
                    Change Customer
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={customerDropdownRef} className="relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type customer name or phone number to search..."
                    value={customerQuery}
                    onChange={e => {
                      setCustomerQuery(e.target.value)
                      setSelectedCustomerId(null)
                      setShowCustomerDropdown(true)
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 pr-10"
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--fg)',
                      borderColor: 'var(--border)',
                    }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }}>
                    <Search className="h-4 w-4" />
                  </div>
                </div>

                {/* Autocomplete Dropdown */}
                {showCustomerDropdown && (
                  <div
                    className="absolute z-50 left-0 right-0 mt-1.5 max-h-64 overflow-y-auto rounded-xl border shadow-2xl py-1 text-xs"
                    style={{
                      background: 'var(--card)',
                      borderColor: 'var(--border-strong)',
                    }}
                  >
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(c => {
                        const custOrds = allOrders.filter(o => o.customer_id === c.id)
                        const custBal = custOrds.reduce((sum, o) => {
                          const bal = Number(o.balance ?? (Number(o.total_amount) - Number(o.deposit || 0)))
                          return sum + Math.max(0, bal)
                        }, 0)

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-purple-500/10 transition-colors border-b last:border-0"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <div>
                              <p className="font-bold text-sm" style={{ color: 'var(--fg)' }}>
                                {c.full_name}
                              </p>
                              <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                                {c.phone || 'No phone'} · {custOrds.length} total orders
                              </p>
                            </div>
                            <div className="text-right">
                              {custBal > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                  Owes {formatCurrency(custBal)}
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                  Fully Cleared
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      <div className="p-4 text-center" style={{ color: 'var(--fg-muted)' }}>
                        <p className="font-semibold">No customers found</p>
                        <p className="text-[11px] mt-0.5">Try searching with a different name or phone.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Customer Banner */}
              {selectedCustomerId && (
                <div
                  className="mt-3 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  style={{ background: 'var(--surface-hover)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-sm">
                      {customerQuery.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--fg)' }}>
                        {customerQuery}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {allCustomers.find(c => c.id === selectedCustomerId)?.phone || 'No phone'}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>Total Pending Balance:</span>
                    <p className={`font-bold text-base ${totalOutstanding > 0 ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatCurrency(totalOutstanding)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Customer Orders & Balance Selection */}
          {selectedCustomerId && (
            <Card style={{ borderColor: 'var(--border)' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-purple-500" />
                  2. Select Order to Pay Towards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customerOrders.length === 0 ? (
                  <div className="p-6 text-center" style={{ color: 'var(--fg-muted)' }}>
                    <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold">No orders recorded for this customer yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customerOrders.map(ord => {
                      const statusInfo = getOrderStatus(ord)
                      const isSelected = selectedOrderId === ord.id
                      const bal = Number(ord.balance ?? (Number(ord.total_amount) - Number(ord.deposit || 0)))

                      return (
                        <div
                          key={ord.id}
                          onClick={() => handleSelectOrder(ord)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isSelected
                              ? 'ring-2 ring-purple-500 border-purple-500/50 bg-purple-500/5'
                              : 'hover:bg-purple-500/5'
                          }`}
                          style={{ borderColor: isSelected ? undefined : 'var(--border)' }}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="selected_order"
                              checked={isSelected}
                              onChange={() => handleSelectOrder(ord)}
                              className="mt-1 h-4 w-4 text-purple-600"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm" style={{ color: 'var(--fg)' }}>
                                  ORD-{ord.order_number}
                                </span>
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
                                  style={statusInfo.badgeStyle}
                                >
                                  {statusInfo.label}
                                </span>
                              </div>
                              <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                                Created: {formatDate(ord.created_at)} · Staff: {ord.employee?.name || 'Attendant'}
                              </p>
                              {ord.order_items && ord.order_items.length > 0 && (
                                <p className="text-[11px] truncate max-w-md mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
                                  Items: {ord.order_items.map(i => `${i.item_name} (x${i.quantity})`).join(', ')}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 gap-1 text-xs">
                            <span style={{ color: 'var(--fg-muted)' }}>
                              Total: {formatCurrency(ord.total_amount)}
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              Paid: {formatCurrency(ord.deposit)}
                            </span>
                            <span className={`font-bold text-sm ${bal > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              Pending: {formatCurrency(bal)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment Details Form */}
          {selectedOrderId && (
            <Card style={{ borderColor: 'var(--border)' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-500" />
                  3. Payment Amount & Attendant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  {/* Amount with Quick Pre-fill buttons */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium" style={{ color: 'var(--fg)' }}>
                      Amount to Pay (UGX) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="500"
                        min="500"
                        required
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="e.g. 150000"
                        className="w-full rounded-xl border px-3.5 py-2.5 text-base font-bold focus:outline-none focus:ring-2"
                        style={{
                          background: 'var(--surface)',
                          color: 'var(--fg)',
                          borderColor: 'var(--border)',
                        }}
                      />
                    </div>

                    {/* Quick helper shortcuts */}
                    {currentOrderBalance > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span style={{ color: 'var(--fg-muted)' }}>Quick Pay:</span>
                        <button
                          type="button"
                          onClick={() => setAmount(String(currentOrderBalance))}
                          className="px-2.5 py-1 rounded-md border text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          Full Balance ({formatCurrency(currentOrderBalance)})
                        </button>
                        {currentOrderBalance >= 2000 && (
                          <button
                            type="button"
                            onClick={() => setAmount(String(Math.round(currentOrderBalance / 2)))}
                            className="px-2.5 py-1 rounded-md border text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                          >
                            50% ({formatCurrency(Math.round(currentOrderBalance / 2))})
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Payment Method & Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Payment Method (Default: Cash)"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                    >
                      <option value="cash">Cash (Default)</option>
                      <option value="momo">MTN Mobile Money</option>
                      <option value="airtel">Airtel Money</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="card">Card / POS</option>
                      <option value="other">Other</option>
                    </Select>

                    <Select
                      label="Payment Classification"
                      value={paymentType}
                      onChange={e => setPaymentType(e.target.value)}
                    >
                      <option value="payment">Standard Payment</option>
                      <option value="deposit">Initial / Partial Deposit</option>
                    </Select>
                  </div>

                  {/* Attending Staff */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Attending Staff (Sales Rep)"
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                    >
                      <option value="">— Use Order's Assigned Staff —</option>
                      {activeStaff.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role || 'Staff'})
                        </option>
                      ))}
                    </Select>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                        Cashier Shift
                      </label>
                      <div
                        className="p-2.5 rounded-lg border text-xs flex items-center justify-between"
                        style={{ background: 'var(--surface-hover)', borderColor: 'var(--border)' }}
                      >
                        <span className="font-semibold" style={{ color: 'var(--fg)' }}>
                          {fullName || 'Admin & Cashier'}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          Active Cashier
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                      Transaction Notes / Ref (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cleared balance for living room curtains"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-2"
                      style={{
                        background: 'var(--surface)',
                        color: 'var(--fg)',
                        borderColor: 'var(--border)',
                      }}
                    />
                  </div>

                  {/* Live Dynamic Balance Breakdown */}
                  <div
                    className="p-4 rounded-xl border grid grid-cols-3 gap-2 text-center"
                    style={{ background: 'var(--surface-hover)', borderColor: 'var(--border)' }}
                  >
                    <div>
                      <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--fg-muted)' }}>
                        Current Balance
                      </p>
                      <p className="text-base font-bold mt-0.5" style={{ color: 'var(--fg)' }}>
                        {formatCurrency(currentOrderBalance)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                        Paying Now
                      </p>
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatCurrency(numericAmount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--fg-muted)' }}>
                        Remaining Balance
                      </p>
                      <p className={`text-base font-black mt-0.5 ${newRemainingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {newRemainingBalance === 0 ? '🎉 CLEARED' : formatCurrency(newRemainingBalance)}
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      loading={submitting}
                      disabled={!numericAmount || numericAmount <= 0}
                      className="w-full sm:w-auto px-8"
                    >
                      <Check className="h-4 w-4" /> Confirm & Record Payment
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
