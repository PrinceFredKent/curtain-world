// src/hooks/useTransactions.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const TXN_SELECT = `
  *,
  customer:customers(*),
  order:orders(order_number, total_amount, deposit, balance, status),
  employee:staff!transactions_employee_id_fkey(*),
  cashier:staff!transactions_cashier_id_fkey(*)
`

export function useTransactions({ orderId, customerId, from, to, page = 1, perPage = 50 } = {}) {
  return useQuery({
    queryKey: ['transactions', orderId, customerId, from, to, page, perPage],
    queryFn: async () => {
      const offset = (page - 1) * perPage
      let query = supabase
        .from('transactions')
        .select(TXN_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + perPage - 1)

      if (orderId) query = query.eq('order_id', orderId)
      if (customerId) query = query.eq('customer_id', customerId)
      if (from) query = query.gte('created_at', from.toISOString())
      if (to) query = query.lte('created_at', to.toISOString())

      const { data, error, count } = await query
      if (error) throw error
      return { data, count }
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
        .select(TXN_SELECT)
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', data.order_id] })
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
    },
  })
}
