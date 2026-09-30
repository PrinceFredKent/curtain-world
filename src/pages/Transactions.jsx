// src/pages/Transactions.jsx
import { useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { formatCurrency, formatDateTime, getDateRange } from '../lib/utils'
import { Download, ArrowUpDown } from 'lucide-react'
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
  const [period, setPeriod] = useState('month')
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
  const total = data?.count || 0
  const totalReceived = txns.reduce((s, t) => s + Number(t.amount), 0)

  const handleDownload = (txn) => {
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
    } catch (err) {
      toast({ type: 'error', message: 'PDF failed: ' + err.message })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Transaction History</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            {total} transactions · {formatCurrency(totalReceived)} collected
          </p>
        </div>
        <Select value={period} onChange={e => { setPeriod(e.target.value); setPage(1) }} className="w-36">
          <option value="day">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <CardContent>
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 rounded-lg" style={{ background: 'var(--surface-hover)' }} />)}
            </div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Customer', 'Order', 'Type', 'Amount', 'Method', 'Cashier', 'Employee', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map((txn, idx) => (
                  <TrHover key={txn.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>{formatDateTime(txn.created_at)}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--fg)' }}>{txn.customer?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {txn.order_id ? (
                        <Link to={`/orders/${txn.order_id}`} className="hover:underline font-mono text-xs" style={{ color: 'var(--brand)' }}>
                          ORD-{txn.order?.order_number}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={txn.type === 'deposit' ? 'purple' : 'green'}>
                        {txn.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(txn.amount)}</td>
                    <td className="px-4 py-3 text-sm capitalize" style={{ color: 'var(--fg-muted)' }}>{txn.payment_method}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--fg-muted)' }}>{txn.cashier?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--fg-muted)' }}>{txn.employee?.name || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDownload(txn)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--brand)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-light)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="Download receipt"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </TrHover>
                ))}
                {txns.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center">
                      <ArrowUpDown className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--border-strong)' }} />
                      <p className="text-sm" style={{ color: 'var(--fg-subtle)' }}>No transactions in this period</p>
                    </td>
                  </tr>
                )}
              </tbody>
              {txns.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface-hover)' }}>
                    <td colSpan={4} className="px-4 py-3 text-sm font-bold text-right" style={{ color: 'var(--fg)' }}>Total Collected</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalReceived)}</td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {total > 50 && (
          <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Page {page} of {Math.ceil(total / 50)}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * 50 >= total}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
