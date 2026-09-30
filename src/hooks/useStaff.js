// src/hooks/useStaff.js
import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isLiveSupabase } from '../lib/supabase'

export function useStaff(roleFilter = null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleSync = () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      queryClient.invalidateQueries({ queryKey: ['staff-all'] })
    }
    window.addEventListener('storage', handleSync)
    window.addEventListener('cw_storage_sync', handleSync)

    // Online Supabase Realtime subscription
    let channel = null
    if (isLiveSupabase && supabase?.channel) {
      const channelName = `realtime-staff-active-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => {
          handleSync()
        })
        .subscribe()
    }

    return () => {
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('cw_storage_sync', handleSync)
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [queryClient])

  return useQuery({
    queryKey: ['staff', roleFilter],
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
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
      // Only return active, verified staff who have an assigned role
      return (data || []).filter(s => (s.verified !== false) && s.role && s.role !== 'pending')
    },
  })
}

export function useAllStaff() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleSync = () => {
      queryClient.invalidateQueries({ queryKey: ['staff-all'] })
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    }
    window.addEventListener('storage', handleSync)
    window.addEventListener('cw_storage_sync', handleSync)

    // Online Supabase Realtime subscription
    let channel = null
    if (isLiveSupabase && supabase?.channel) {
      const channelName = `realtime-staff-all-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => {
          handleSync()
        })
        .subscribe()
    }

    return () => {
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('cw_storage_sync', handleSync)
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [queryClient])

  return useQuery({
    queryKey: ['staff-all'],
    refetchInterval: 2500,
    refetchOnWindowFocus: true,
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
        .insert({
          ...staff,
          verified: true,
          active: true,
          status: 'active',
        })
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

export function useVerifyStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role }) => {
      const { data, error } = await supabase
        .from('staff')
        .update({
          role,
          verified: true,
          active: true,
          status: 'active',
        })
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
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      queryClient.invalidateQueries({ queryKey: ['staff-all'] })
    },
  })
}

export function useRejectStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      queryClient.invalidateQueries({ queryKey: ['staff-all'] })
    },
  })
}

