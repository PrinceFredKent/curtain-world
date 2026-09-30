// src/hooks/useOrders.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const ORDER_SELECT = `
  *,
  customer:customers(*),
  employee:staff!orders_employee_id_fkey(*),
  cashier:staff!orders_cashier_id_fkey(*),
  order_items(*),
  transactions(*)
`

export function useOrders({ search = '', status = '', page = 1, perPage = 20 } = {}) {
  return useQuery({
    queryKey: ['orders', search, status, page, perPage],
    queryFn: async () => {
      const from = (page - 1) * perPage
      const to = from + perPage - 1

      let query = supabase
        .from('orders')
        .select(ORDER_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (status) query = query.eq('status', status)
      if (search) {
        // Search via customer join is complex; do it client-side after fetch for now
      }

      const { data, error, count } = await query
      if (error) throw error
      return { data, count }
    },
  })
}

export function useOrder(id) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_SELECT)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ order, items }) => {
      // 1. Create order
      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single()
      if (orderErr) throw orderErr

      // 2. Create items
      if (items && items.length > 0) {
        const { error: itemsErr } = await supabase
          .from('order_items')
          .insert(items.map(item => ({ ...item, order_id: newOrder.id })))
        if (itemsErr) throw itemsErr
      }

      return newOrder
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, order, items }) => {
      // Update order header
      const { data: updatedOrder, error: orderErr } = await supabase
        .from('orders')
        .update(order)
        .eq('id', id)
        .select()
        .single()
      if (orderErr) throw orderErr

      // Replace items if provided
      if (items !== undefined) {
        await supabase.from('order_items').delete().eq('order_id', id)
        if (items.length > 0) {
          const { error: itemsErr } = await supabase
            .from('order_items')
            .insert(items.map(item => ({ ...item, order_id: id })))
          if (itemsErr) throw itemsErr
        }
      }

      return updatedOrder
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', id] })
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('orders').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
}
