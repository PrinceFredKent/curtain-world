// src/pages/Reports.jsx
import { useState } from 'react'
import { useReport } from '../hooks/useReports'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { formatCurrency, formatDate, formatCompactUGX } from '../lib/utils'
import { generateReportPDF, downloadPDF } from '../lib/pdf'
import { useToast } from '../components/ui/Toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { Download, Printer, TrendingUp, Users, DollarSign, AlertCircle } from 'lucide-react'

const PERIODS = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
]

const COLORS = ['#7c3aed', '#a78bfa', '#c4b5fd', '#38bdf8', '#34d399', '#f59e0b']

function StatBox({ label, value, icon: Icon, bg, fg = '#ffffff' }) {
  return (
    <div className="rounded-xl p-4 shadow-sm" style={{ background: bg, color: fg }}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 opacity-90" />
        <p className="text-sm font-medium opacity-90">{label}</p>
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
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
  const [period, setPeriod] = useState('month')
  const { data, isLoading } = useReport(period)
  const toast = useToast()

  const handleDownloadPDF = () => {
    try {
      const doc = generateReportPDF({
        period,
        summary: data.summary,
        byEmployee: data.byEmployee,
        byCashier: data.byCashier,
        transactions: data.transactions,
      })
      downloadPDF(doc, `report-${period}-${Date.now()}.pdf`)
      toast({ type: 'success', message: 'Report PDF downloaded!' })
    } catch (err) {
      toast({ type: 'error', message: 'PDF failed: ' + err.message })
    }
  }

  const handlePrint = () => window.print()

  const periodLabel = PERIODS.find(p => p.value === period)?.label

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Sales Reports</h1>
          {data && (
            <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
              {formatDate(data.from)} — {formatDate(data.to)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Period tabs */}
          <div className="flex rounded-lg p-1 gap-1 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            {PERIODS.map(p => {
              const active = period === p.value
              return (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={
                    active
                      ? { background: 'var(--brand)', color: 'var(--brand-fg)' }
                      : { color: 'var(--fg-muted)' }
                  }
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print (58mm)
          </Button>
          <Button size="sm" onClick={handleDownloadPDF} disabled={!data}>
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Print Header (only shows when printing) */}
      <div className="print-only print-receipt">
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold' }}>CURTAIN WORLD</h2>
          <p style={{ fontSize: '10px', fontStyle: 'italic' }}>For your curtain desires.</p>
          <div className="print-divider" />
          <p style={{ fontSize: '11px', fontWeight: 'bold' }}>
            SALES REPORT — {periodLabel?.toUpperCase()}
          </p>
          <div className="print-divider" />
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl" style={{ background: 'var(--surface-hover)' }} />)}
          </div>
          <div className="h-64 rounded-xl" style={{ background: 'var(--surface-hover)' }} />
        </div>
      ) : data ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox
              label="Total Sales"
              value={formatCurrency(data.summary.total_sales)}
              icon={TrendingUp}
              bg="var(--brand)"
            />
            <StatBox
              label="Collected"
              value={formatCurrency(data.summary.received)}
              icon={DollarSign}
              bg="#16a34a"
            />
            <StatBox
              label="Outstanding"
              value={formatCurrency(data.summary.owed)}
              icon={AlertCircle}
              bg="#d97706"
            />
            <StatBox
              label="Orders"
              value={data.summary.orders_count}
              icon={Users}
              bg="#9333ea"
            />
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* By Employee */}
            {data.byEmployee.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Sales by Employee</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.byEmployee} layout="vertical" barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} tickFormatter={v => formatCompactUGX(v)} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--fg-muted)' }} width={70} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={v => formatCurrency(v)}
                        contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)' }}
                      />
                      <Bar dataKey="received" name="Collected" fill="var(--brand)" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="owed" name="Owed" fill="#d97706" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* By Cashier */}
            {data.byCashier.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Collected by Cashier</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
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

          {/* Employee Table */}
          {data.byEmployee.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Employee Breakdown</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Employee', 'Orders', 'Total Sales', 'Collected', 'Outstanding'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--fg-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.byEmployee.map((emp, idx) => (
                      <TrHover key={emp.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--fg)' }}>{emp.name}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--fg-muted)' }}>{emp.orders_count}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--fg)' }}>{formatCurrency(emp.total_sales)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(emp.received)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-amber-600 dark:text-amber-400">{formatCurrency(emp.owed)}</td>
                      </TrHover>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Cashier Table */}
          {data.byCashier.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Cashier Breakdown</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Cashier', 'Transactions', 'Total Collected'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--fg-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCashier.map((c, idx) => (
                      <TrHover key={c.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--fg)' }}>{c.name}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--fg-muted)' }}>{c.transactions_count}</td>
                        <td className="px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(c.total_collected)}</td>
                      </TrHover>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
