// src/hooks/useReports.js
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getDateRange } from '../lib/utils'

export function useReport(period = 'all') {
  return useQuery({
    queryKey: ['report', period],
    queryFn: async () => {
      const { from, to } = getDateRange(period)

      // 1. Transactions in range
      let txnQuery = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (from && to) {
        txnQuery = txnQuery.gte('created_at', from.toISOString()).lte('created_at', to.toISOString())
      }

      const { data: txnsData, error: txnErr } = await txnQuery
      if (txnErr) throw txnErr
      const txns = txnsData || []

      // 2. Orders in range
      let ordQuery = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (from && to) {
        ordQuery = ordQuery.gte('created_at', from.toISOString()).lte('created_at', to.toISOString())
      }

      const { data: ordersData, error: ordErr } = await ordQuery
      if (ordErr) throw ordErr
      const orders = ordersData || []

      // 3. Populate Customers, Staff, and Order Items
      const { data: customers } = await supabase.from('customers').select('*')
      const { data: staffList } = await supabase.from('staff').select('*')
      const { data: allItems } = await supabase.from('order_items').select('*')

      const custMap = new Map((customers || []).map(c => [c.id, c]))
      const staffMap = new Map((staffList || []).map(s => [s.id, s]))
      const itemsMap = new Map()

      ;(allItems || []).forEach(item => {
        if (!itemsMap.has(item.order_id)) itemsMap.set(item.order_id, [])
        itemsMap.get(item.order_id).push(item)
      })

      const enrichedOrders = orders.map(ord => ({
        ...ord,
        customer: custMap.get(ord.customer_id) || ord.customer || null,
        employee: staffMap.get(ord.employee_id) || ord.employee || null,
        cashier: staffMap.get(ord.cashier_id) || ord.cashier || null,
        order_items: itemsMap.get(ord.id) || ord.order_items || [],
      }))

      const enrichedTxns = txns.map(t => ({
        ...t,
        customer: custMap.get(t.customer_id) || t.customer || null,
        employee: staffMap.get(t.employee_id) || t.employee || null,
        cashier: staffMap.get(t.cashier_id) || t.cashier || null,
      }))

      // Compute summary
      const received = enrichedTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0)
      const totalSales = enrichedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
      const owed = enrichedOrders.reduce((sum, o) => {
        const bal = Number(o.balance ?? (Number(o.total_amount || 0) - Number(o.deposit || 0)))
        return sum + Math.max(0, bal)
      }, 0)

      // Aggregations by Employee
      const empMap = {}
      enrichedOrders.forEach(o => {
        const empName = o.employee?.name || 'Unassigned'
        const empId = o.employee?.id || 'unassigned'
        if (!empMap[empId]) {
          empMap[empId] = {
            id: empId,
            name: empName,
            role: o.employee?.role || 'Staff',
            orders_count: 0,
            total_sales: 0,
            received: 0,
            owed: 0,
          }
        }
        empMap[empId].orders_count++
        empMap[empId].total_sales += Number(o.total_amount || 0)
        empMap[empId].received += Number(o.deposit || 0)
        empMap[empId].owed += Math.max(0, Number(o.balance ?? (Number(o.total_amount || 0) - Number(o.deposit || 0))))
      })

      // Aggregations by Cashier
      const cashierMap = {}
      enrichedTxns.forEach(t => {
        const cName = t.cashier?.name || 'Admin & Cashier'
        const cId = t.cashier?.id || 'cashier-default'
        if (!cashierMap[cId]) {
          cashierMap[cId] = {
            id: cId,
            name: cName,
            transactions_count: 0,
            total_collected: 0,
          }
        }
        cashierMap[cId].transactions_count++
        cashierMap[cId].total_collected += Number(t.amount || 0)
      })

      return {
        period,
        from,
        to,
        summary: { orders_count: enrichedOrders.length, received, total_sales: totalSales, owed },
        byEmployee: Object.values(empMap),
        byCashier: Object.values(cashierMap),
        transactions: enrichedTxns,
        orders: enrichedOrders,
      }
    },
    staleTime: 30_000,
  })
}
