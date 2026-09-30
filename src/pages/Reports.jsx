// src/pages/Reports.jsx
import { useState } from 'react'
import { useReport } from '../hooks/useReports'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { formatCurrency, formatDate, getOrderStatus } from '../lib/utils'
import { generateReportPDF, downloadPDF, downloadOrderPDF, downloadOrderPNG, printOrderReceipt } from '../lib/pdf'
import { useToast } from '../components/ui/Toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  Download,
  Printer,
  TrendingUp,
  Users,
  DollarSign,
  Search,
  FileText,
  Image as ImageIcon,
  Package,
  Layers,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
]

const COLORS = ['#7c3aed', '#a78bfa', '#c4b5fd', '#38bdf8', '#34d399', '#f59e0b', '#ec4899']

function StatBox({ label, value, icon: Icon, bg, fg = '#ffffff' }) {
  return (
    <div className="rounded-2xl p-4.5 shadow-sm border transition-transform hover:-translate-y-0.5" style={{ background: bg, color: fg, borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
          <Icon className="h-5 w-5 opacity-95" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-90">{label}</p>
      </div>
      <p className="text-2xl font-black mt-3 tracking-tight">{value}</p>
    </div>
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

export function Reports() {
  const [period, setPeriod] = useState('all')
  const [search, setSearch] = useState('')
  const { data, isLoading } = useReport(period)
  const toast = useToast()

  const handleDownloadFullReportPDF = () => {
    try {
      const doc = generateReportPDF({
        period,
        summary: data.summary,
        byEmployee: data.byEmployee,
        byCashier: data.byCashier,
        transactions: data.transactions,
      })
      downloadPDF(doc, `sales-report-${period}-${Date.now()}.pdf`)
      toast({ type: 'success', message: 'Report PDF downloaded!' })
    } catch (err) {
      toast({ type: 'error', message: 'PDF failed: ' + err.message })
    }
  }

  const handlePrintFullReport = () => window.print()

  const handlePrintRow = (order) => {
    try {
      printOrderReceipt({ order })
      toast({ type: 'success', message: 'Print window opened.' })
    } catch (err) {
      toast({ type: 'error', message: 'Print failed: ' + err.message })
    }
  }

  const handleDownloadRowPDF = (order) => {
    try {
      downloadOrderPDF({ order }, `order-ORD-${order.order_number || order.id?.slice(0, 6)}.pdf`)
      toast({ type: 'success', message: 'Order PDF downloaded!' })
    } catch (err) {
      toast({ type: 'error', message: 'PDF failed: ' + err.message })
    }
  }

  const handleDownloadRowPNG = (order) => {
    try {
      downloadOrderPNG({ order }, `order-ORD-${order.order_number || order.id?.slice(0, 6)}.png`)
      toast({ type: 'success', message: 'Order PNG downloaded!' })
    } catch (err) {
      toast({ type: 'error', message: 'PNG failed: ' + err.message })
    }
  }

  // Filter orders by Item name, Employee name, or Customer name
  const allOrders = data?.orders || []
  const filteredOrders = allOrders.filter(ord => {
    if (!search) return true
    const q = search.toLowerCase()
    const matchCustomer = ord.customer?.full_name?.toLowerCase().includes(q) || ord.customer?.phone?.toLowerCase().includes(q)
    const matchEmployee = ord.employee?.name?.toLowerCase().includes(q)
    const matchItem = ord.order_items?.some(i => i.item_name?.toLowerCase().includes(q))
    const matchOrderNum = String(ord.order_number).includes(q)
    return matchCustomer || matchEmployee || matchItem || matchOrderNum
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
            Sales & Staff Attribution Reports
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Track revenue collected by the Cashier and orders attributed to each employee
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector tabs */}
          <div
            className="flex rounded-xl p-1 gap-1 border shadow-xs"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            {PERIODS.map(p => {
              const active = period === p.value
              return (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={
                    active
                      ? { background: 'var(--brand)', color: '#ffffff' }
                      : { color: 'var(--fg-muted)' }
                  }
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          <Button variant="secondary" size="sm" onClick={handlePrintFullReport}>
            <Printer className="h-4 w-4" /> Print (58mm)
          </Button>
          <Button size="sm" onClick={handleDownloadFullReportPDF} disabled={!data}>
            <Download className="h-4 w-4" /> Export Report PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-xl" style={{ background: 'var(--surface-hover)' }} />
            ))}
          </div>
        </div>
      ) : data ? (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox
              label="Total Revenue Collected"
              value={formatCurrency(data.summary.received)}
              icon={DollarSign}
              bg="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            />
            <StatBox
              label="Total Gross Sales"
              value={formatCurrency(data.summary.total_sales)}
              icon={TrendingUp}
              bg="linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)"
            />
            <StatBox
              label="Outstanding Customer Balance"
              value={formatCurrency(data.summary.owed)}
              icon={Users}
              bg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            />
            <StatBox
              label="Total Orders"
              value={`${data.summary.orders_count}`}
              icon={Package}
              bg="linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
            />
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* By Employee Chart */}
            {data.byEmployee.length > 0 && (
              <Card style={{ borderColor: 'var(--border)' }}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    Sales Generated by Staff Member
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={data.byEmployee} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis type="number" tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={v => formatCurrency(v)}
                        contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)' }}
                      />
                      <Bar dataKey="received" name="Amount Collected" fill="var(--brand)" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="owed" name="Balance Owed" fill="#d97706" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* By Cashier Pie */}
            {data.byCashier.length > 0 && (
              <Card style={{ borderColor: 'var(--border)' }}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    Cashier Collections Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie
                        data={data.byCashier}
                        dataKey="total_collected"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {data.byCashier.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={v => formatCurrency(v)}
                        contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Comprehensive Employee Sales & Attributed Orders Breakdown Table */}
          <Card className="overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
            <div
              className="p-4 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-500" />
                  Employee Sales & Attributed Orders Breakdown
                </CardTitle>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                  Detailed client orders, curtain items, and payment progress per employee
                </p>
              </div>

              {/* Real-time Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--fg-muted)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search item, employee, or customer..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--fg)',
                  }}
                />
              </div>
            </div>

            <CardContent className="p-0">
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
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items / Specifications</th>
                      <th className="py-3 px-4">Order Total</th>
                      <th className="py-3 px-4">Paid / Collected</th>
                      <th className="py-3 px-4">Outstanding</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {filteredOrders.map(ord => {
                      const statusInfo = getOrderStatus(ord)
                      const items = ord.order_items || []

                      return (
                        <TrHover key={ord.id}>
                          {/* Employee */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-sm" style={{ color: 'var(--fg)' }}>
                              {ord.employee?.name || 'Unassigned'}
                            </div>
                            <div className="text-[11px] capitalize" style={{ color: 'var(--fg-muted)' }}>
                              {ord.employee?.role ? `Role: ${ord.employee.role}` : 'Attendant'}
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>
                              {ord.customer?.full_name || '—'}
                            </div>
                            <div className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                              {ord.customer?.phone || 'No phone'}
                            </div>
                          </td>

                          {/* Items */}
                          <td className="py-3.5 px-4 max-w-[220px]">
                            {items.length > 0 ? (
                              <div className="space-y-1">
                                {items.map((it, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="truncate font-medium" style={{ color: 'var(--fg)' }}>
                                      • {it.item_name}
                                    </span>
                                    <span className="shrink-0 font-mono px-1 rounded bg-zinc-100 dark:bg-zinc-800" style={{ color: 'var(--fg-muted)' }}>
                                      x{it.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--fg-muted)' }}>Custom Order</span>
                            )}
                          </td>

                          {/* Order Total */}
                          <td className="py-3.5 px-4 font-bold text-sm" style={{ color: 'var(--fg)' }}>
                            {formatCurrency(ord.total_amount)}
                          </td>

                          {/* Paid */}
                          <td className="py-3.5 px-4 font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(ord.deposit)}
                          </td>

                          {/* Outstanding */}
                          <td className={`py-3.5 px-4 font-bold text-sm ${Number(ord.balance) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {formatCurrency(ord.balance)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                              style={statusInfo.badgeStyle}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.isCleared ? 'bg-emerald-500' : statusInfo.percent > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                              {statusInfo.label}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono" style={{ color: 'var(--fg-muted)' }}>
                            {formatDate(ord.created_at)}
                          </td>

                          {/* Action Icons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Print Row */}
                              <button
                                type="button"
                                onClick={() => handlePrintRow(ord)}
                                className="p-1.5 rounded-lg border hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                title="Print voucher for this sale"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>

                              {/* Download PDF */}
                              <button
                                type="button"
                                onClick={() => handleDownloadRowPDF(ord)}
                                className="p-1.5 rounded-lg border hover:bg-purple-500/10 transition-colors"
                                style={{ borderColor: 'var(--border)', color: 'var(--brand)' }}
                                title="Download PDF Voucher"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </button>

                              {/* Download PNG */}
                              <button
                                type="button"
                                onClick={() => handleDownloadRowPNG(ord)}
                                className="p-1.5 rounded-lg border hover:bg-emerald-500/10 transition-colors"
                                style={{ borderColor: 'var(--border)', color: '#16a34a' }}
                                title="Download PNG Voucher"
                              >
                                <ImageIcon className="h-3.5 w-3.5" />
                              </button>

                              <Link
                                to={`/orders/${ord.id}`}
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

                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-5 py-12 text-center">
                          <Package className="h-10 w-10 mx-auto mb-2 opacity-40" style={{ color: 'var(--border-strong)' }} />
                          <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>No matching orders found</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                            {search ? 'Try adjusting your search terms.' : 'Sales attributed to staff members will appear here.'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
