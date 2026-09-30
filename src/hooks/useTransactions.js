// src/hooks/useTransactions.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useTransactions({ orderId, customerId, from, to, page = 1, perPage = 50 } = {}) {
  return useQuery({
    queryKey: ['transactions', orderId, customerId, from, to, page, perPage],
    queryFn: async () => {
      const offset = (page - 1) * perPage

      // 1. Query transactions
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (orderId) query = query.eq('order_id', orderId)
      if (customerId) query = query.eq('customer_id', customerId)
      if (from) query = query.gte('created_at', from.toISOString())
      if (to) query = query.lte('created_at', to.toISOString())

      query = query.range(offset, offset + perPage - 1)

      const { data: txns, error, count } = await query
      if (error) throw error

      // 2. Safely populate relations
      const { data: customers } = await supabase.from('customers').select('*')
      const { data: staffList } = await supabase.from('staff').select('*')
      const { data: orders } = await supabase.from('orders').select('*')

      const custMap = new Map((customers || []).map(c => [c.id, c]))
      const staffMap = new Map((staffList || []).map(s => [s.id, s]))
      const ordMap = new Map((orders || []).map(o => [o.id, o]))

      const enriched = (txns || []).map(t => ({
        ...t,
        customer: custMap.get(t.customer_id) || t.customer || null,
        employee: staffMap.get(t.employee_id) || t.employee || null,
        cashier: staffMap.get(t.cashier_id) || t.cashier || null,
        order: ordMap.get(t.order_id) || t.order || null,
      }))

      return { data: enriched, count: count || enriched.length }
    },
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (txn) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(txn)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['report'] })
      if (data?.order_id) {
        queryClient.invalidateQueries({ queryKey: ['order', data.order_id] })
      }
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['report'] })
    },
  })
}
