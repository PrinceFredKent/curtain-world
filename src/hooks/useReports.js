// src/hooks/useReports.js
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getDateRange } from '../lib/utils'

export function useReport(period) {
  return useQuery({
    queryKey: ['report', period],
    queryFn: async () => {
      const { from, to } = getDateRange(period)

      // Transactions in range
      const { data: txns, error: txnErr } = await supabase
        .from('transactions')
        .select('*, order:orders(total_amount, balance), employee:staff!transactions_employee_id_fkey(id, name), cashier:staff!transactions_cashier_id_fkey(id, name)')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())

      if (txnErr) throw txnErr

      // Orders in range
      const { data: orders, error: ordErr } = await supabase
        .from('orders')
        .select('*, employee:staff!orders_employee_id_fkey(id, name), cashier:staff!orders_cashier_id_fkey(id, name)')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())

      if (ordErr) throw ordErr

      // Compute summary
      const received = txns.reduce((sum, t) => sum + Number(t.amount), 0)
      const totalSales = orders.reduce((sum, o) => sum + Number(o.total_amount), 0)
      const owed = orders.reduce((sum, o) => sum + Number(o.balance ?? 0), 0)

      // By employee
      const empMap = {}
      orders.forEach(o => {
        if (!o.employee) return
        const { id, name } = o.employee
        if (!empMap[id]) empMap[id] = { id, name, orders_count: 0, total_sales: 0, received: 0, owed: 0 }
        empMap[id].orders_count++
        empMap[id].total_sales += Number(o.total_amount)
        empMap[id].received += Number(o.deposit ?? 0)
        empMap[id].owed += Number(o.balance ?? 0)
      })

      // By cashier
      const cashierMap = {}
      txns.forEach(t => {
        if (!t.cashier) return
        const { id, name } = t.cashier
        if (!cashierMap[id]) cashierMap[id] = { id, name, transactions_count: 0, total_collected: 0 }
        cashierMap[id].transactions_count++
        cashierMap[id].total_collected += Number(t.amount)
      })

      return {
        period,
        from,
        to,
        summary: { orders_count: orders.length, received, total_sales: totalSales, owed },
        byEmployee: Object.values(empMap),
        byCashier: Object.values(cashierMap),
        transactions: txns,
        orders,
      }
    },
    staleTime: 60_000, // 1 minute cache
  })
}
