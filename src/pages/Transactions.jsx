// src/pages/Transactions.jsx
import { useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { formatCurrency, formatDateTime, getDateRange, getPaymentMethodLabel } from '../lib/utils'
import { ArrowUpDown, Search, FileText } from 'lucide-react'
import { generateReceiptPDF, downloadPDF } from '../lib/pdf'
import { useToast } from '../components/ui/Toast'
import { Link } from 'react-router-dom'

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

export function Transactions() {
  const [period, setPeriod] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const toast = useToast()

  const range = getDateRange(period)
  const { data, isLoading } = useTransactions({
    from: range.from,
    to: range.to,
    page,
    perPage: 50,
  })

  const txns = data?.data || []
  const totalCount = data?.count || 0

  const filteredTxns = txns.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.customer?.full_name?.toLowerCase().includes(q) ||
      t.customer?.phone?.toLowerCase().includes(q) ||
      t.employee?.name?.toLowerCase().includes(q) ||
      t.cashier?.name?.toLowerCase().includes(q) ||
      String(t.order?.order_number || '').includes(q) ||
      String(t.id).toLowerCase().includes(q) ||
      String(t.payment_method || '').toLowerCase().includes(q)
    )
  })

  const totalReceived = filteredTxns.reduce((s, t) => s + Number(t.amount || 0), 0)

  const handleDownloadPDF = (txn) => {
    try {
      const doc = generateReceiptPDF({
        transaction: txn,
        order: txn.order,
        customer: txn.customer,
        employee: txn.employee,
        cashier: txn.cashier,
        items: [],
      })
      downloadPDF(doc, `receipt-${txn.id.slice(0, 8)}.pdf`)
      toast({ type: 'success', message: 'Receipt PDF downloaded!' })
    } catch (err) {
      toast({ type: 'error', message: 'PDF failed: ' + err.message })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
            Transaction History
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            {filteredTxns.length} transactions recorded · <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(totalReceived)}</strong> total collected
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={period}
            onChange={e => { setPeriod(e.target.value); setPage(1) }}
            className="w-40"
          >
            <option value="all">All Time</option>
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </Select>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search by customer, staff, payment method, or order #..."
            icon={<Search className="h-4 w-4" />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        {isLoading ? (
          <CardContent>
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 rounded-lg" style={{ background: 'var(--surface-hover)' }} />
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
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount (UGX)</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Attending Staff</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {filteredTxns.map(txn => (
                  <TrHover key={txn.id}>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono" style={{ color: 'var(--fg-muted)' }}>
                      {formatDateTime(txn.created_at)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>
                        {txn.customer?.full_name || '—'}
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                        {txn.customer?.phone || 'No phone'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {txn.order_id ? (
                        <Link
                          to={`/orders/${txn.order_id}`}
                          className="hover:underline font-mono text-xs font-semibold"
                          style={{ color: 'var(--brand)' }}
                        >
                          ORD-{txn.order?.order_number || txn.order_id?.slice(0, 6)}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--fg-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={txn.type === 'deposit' ? 'purple' : 'green'}>
                        {txn.type === 'deposit' ? 'Deposit' : 'Payment'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="py-3.5 px-4" style={{ color: 'var(--fg)' }}>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border)' }}>
                        {getPaymentMethodLabel(txn.payment_method)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4" style={{ color: 'var(--fg-muted)' }}>
                      {txn.employee?.name || '—'}
                    </td>
                    <td className="py-3.5 px-4" style={{ color: 'var(--fg-muted)' }}>
                      {txn.cashier?.name || 'Admin & Cashier'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadPDF(txn)}
                        className="p-1.5 rounded-lg border transition-colors inline-flex items-center gap-1 text-xs font-medium hover:bg-purple-500/10"
                        style={{ color: 'var(--brand)', borderColor: 'var(--border)' }}
                        title="Download Receipt PDF"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        PDF
                      </button>
                    </td>
                  </TrHover>
                ))}

                {filteredTxns.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center">
                      <ArrowUpDown className="h-10 w-10 mx-auto mb-2 opacity-40" style={{ color: 'var(--border-strong)' }} />
                      <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>No transactions found</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                        {search ? 'No payments match your search filter.' : 'Transactions will appear here whenever sales deposits or payments are recorded.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>

              {filteredTxns.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface-hover)' }}>
                    <td colSpan={4} className="px-4 py-3.5 text-sm font-bold text-right" style={{ color: 'var(--fg)' }}>
                      Total Filtered Collections:
                    </td>
                    <td className="px-4 py-3.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totalReceived)}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {totalCount > 50 && (
          <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Page {page} of {Math.ceil(totalCount / 50)}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * 50 >= totalCount}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
