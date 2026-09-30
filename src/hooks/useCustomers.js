// src/hooks/useCustomers.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useCustomers(search = '') {
  return useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('full_name')

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useCustomer(id) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (customer) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('customers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })
}
