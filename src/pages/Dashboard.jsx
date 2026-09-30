// src/pages/Dashboard.jsx
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, formatCompactUGX } from '../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Link } from 'react-router-dom'
import { TrendingUp, ShoppingBag, Users, DollarSign, AlertCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

function StatCard({ title, value, icon: Icon, bg, sub }) {
  return (
    <Card hoverEffect className="group cursor-pointer">
      <CardContent className="flex items-start gap-4 pt-5">
        <div
          className="p-3 rounded-2xl shrink-0 transition-transform duration-300 group-hover:scale-115 group-hover:rotate-6 shadow-xs"
          style={{ background: bg }}
        >
          <Icon className="h-5 w-5 text-white transition-transform duration-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>{title}</p>
          <p className="text-2xl font-bold mt-0.5 tracking-tight" style={{ color: 'var(--fg)' }}>{value}</p>
          {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-subtle)' }}>{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

const statusBadge = (status) => {
  const map = {
    paid:      { variant: 'green',  label: 'Paid' },
    partial:   { variant: 'yellow', label: 'Partial' },
    pending:   { variant: 'red',    label: 'Pending' },
    cancelled: { variant: 'default',label: 'Cancelled' },
  }
  const { variant, label } = map[status] || map.pending
  return <Badge variant={variant}>{label}</Badge>
}

export function Dashboard() {
  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()

  const { data: todayStats } = useQuery({
    queryKey: ['dashboard-today'],
    queryFn: async () => {
      const [txnRes, ordRes] = await Promise.all([
        supabase.from('transactions').select('amount').gte('created_at', startOfDay),
        supabase.from('orders').select('id, total_amount, balance').gte('created_at', startOfDay),
      ])
      const received = (txnRes.data || []).reduce((s, t) => s + Number(t.amount), 0)
      const orders   = ordRes.data || []
      const totalSales = orders.reduce((s, o) => s + Number(o.total_amount), 0)
      const owed = orders.reduce((s, o) => s + Number(o.balance ?? 0), 0)
      return { received, totalSales, orders, owed }
    },
    refetchInterval: 60_000,
  })

  const { data: customerCount } = useQuery({
    queryKey: ['customer-count'],
    queryFn: async () => {
      const { count } = await supabase.from('customers').select('id', { count: 'exact', head: true })
      return count
    },
  })

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, customer:customers(full_name, phone)')
        .order('created_at', { ascending: false })
        .limit(8)
      return data || []
    },
    refetchInterval: 30_000,
  })

  const { data: weeklyData } = useQuery({
    queryKey: ['weekly-chart'],
    queryFn: async () => {
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        days.push({ date: d.toISOString().split('T')[0], label: d.toLocaleDateString('en', { weekday: 'short' }) })
      }
      const { data: txns } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .gte('created_at', days[0].date + 'T00:00:00.000Z')
      const dayMap = {}
      days.forEach(d => { dayMap[d.date] = { ...d, received: 0 } })
      ;(txns || []).forEach(t => {
        const key = t.created_at.split('T')[0]
        if (dayMap[key]) dayMap[key].received += Number(t.amount)
      })
      return Object.values(dayMap)
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
          {new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Revenue"   value={formatCurrency(todayStats?.received ?? 0)}    icon={DollarSign}  bg="var(--brand)"  sub="Collected today" />
        <StatCard title="Today's Orders"    value={todayStats?.orders?.length ?? 0}               icon={ShoppingBag} bg="#7c3aed99"      sub={`${formatCurrency(todayStats?.totalSales ?? 0)} total`} />
        <StatCard title="Balance Owed"      value={formatCurrency(todayStats?.owed ?? 0)}         icon={AlertCircle} bg="#d97706"        sub="Today's outstanding" />
        <StatCard title="Total Customers"   value={customerCount ?? '—'}                          icon={Users}       bg="#7c3aed"        sub="All time" />
      </div>

      {/* Chart + Recent */}
      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Revenue — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData || []} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompactUGX(v)} />
                <Tooltip
                  formatter={v => formatCurrency(v)}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)' }}
                />
                <Bar dataKey="received" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <Link to="/orders" className="text-sm font-medium hover:underline" style={{ color: 'var(--brand)' }}>
              View all
            </Link>
          </CardHeader>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {(recentOrders || []).slice(0, 6).map(order => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center justify-between px-5 py-3 transition-colors"
                style={{ color: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>
                    {order.customer?.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>ORD-{order.order_number}</p>
                </div>
                <div className="text-right ml-3 shrink-0">
                  {statusBadge(order.status)}
                  <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{formatCurrency(order.total_amount)}</p>
                </div>
              </Link>
            ))}
            {(!recentOrders || recentOrders.length === 0) && (
              <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--fg-subtle)' }}>No orders yet</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
