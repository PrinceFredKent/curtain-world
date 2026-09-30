// src/hooks/useStaff.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useStaff(roleFilter = null) {
  return useQuery({
    queryKey: ['staff', roleFilter],
    queryFn: async () => {
      let query = supabase
        .from('staff')
        .select('*')
        .eq('active', true)
        .order('name')

      if (roleFilter) {
        query = query.in('role', [roleFilter, 'both'])
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useAllStaff() {
  return useQuery({
    queryKey: ['staff-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (staff) => {
      const { data, error } = await supabase
        .from('staff')
        .insert(staff)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      queryClient.invalidateQueries({ queryKey: ['staff-all'] })
    },
  })
}

export function useUpdateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('staff')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      queryClient.invalidateQueries({ queryKey: ['staff-all'] })
    },
  })
}

export function useDeleteStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('staff')
        .update({ active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      queryClient.invalidateQueries({ queryKey: ['staff-all'] })
    },
  })
}
