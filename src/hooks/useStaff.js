// src/hooks/useStaff.js
import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isLiveSupabase } from '../lib/supabase'

export function getStoredStaffPins() {
  try {
    return JSON.parse(localStorage.getItem('cw_staff_pins') || '{}')
  } catch {
    return {}
  }
}

export function saveStaffPin(staffId, email, phone, pinCode) {
  if (!pinCode) return
  try {
    const pins = getStoredStaffPins()
    const pinStr = String(pinCode).trim()
    if (staffId) pins[staffId] = pinStr
    if (email) pins[email.toLowerCase().trim()] = pinStr
    if (phone) pins[phone.trim()] = pinStr
    localStorage.setItem('cw_staff_pins', JSON.stringify(pins))
    window.dispatchEvent(new CustomEvent('cw_storage_sync', { detail: { key: 'cw_staff_pins' } }))
  } catch (err) {
    console.error('Failed to persist staff pin:', err)
  }
}

function enrichStaffWithPin(staffList) {
  const pins = getStoredStaffPins()
  return (staffList || []).map(s => {
    const isPaymentRole = ['cashier', 'employee', 'admin', 'super_admin', 'both'].includes(s.role)
    const storedPin = s.pin_code ||
      (s.id ? pins[s.id] : null) ||
      (s.email ? pins[s.email.toLowerCase().trim()] : null) ||
      (s.phone ? pins[s.phone.trim()] : null)

    const finalPin = storedPin || (isPaymentRole ? '1234' : null)

    return {
      ...s,
      pin_code: finalPin ? String(finalPin) : null,
    }
  })
}

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
      const enriched = enrichStaffWithPin(data || [])
      // Only return active, verified staff who have an assigned role
      return enriched.filter(s => (s.verified !== false) && s.role && s.role !== 'pending')
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
      return enrichStaffWithPin(data || [])
    },
  })
}

export function useCreateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (staff) => {
      const pinCode = staff.pin_code || '1234'
      const payloadWithPin = {
        ...staff,
        pin_code: pinCode,
        verified: true,
        active: true,
        status: 'active',
      }

      let data = null
      let error = null

      try {
        const res = await supabase
          .from('staff')
          .insert(payloadWithPin)
          .select()
          .single()
        data = res.data
        error = res.error
      } catch (e) {
        error = e
      }

      // If remote Supabase schema does not have 'pin_code' column in Postgres cache, retry safely without it
      if (error && (
        error.message?.includes('pin_code') ||
        error.message?.includes('schema cache') ||
        error.code === 'PGRST204' ||
        error.code === '42703'
      )) {
        const { pin_code: _discarded, ...payloadWithoutPin } = payloadWithPin
        const retryRes = await supabase
          .from('staff')
          .insert(payloadWithoutPin)
          .select()
          .single()
        if (retryRes.error) throw retryRes.error
        data = retryRes.data
      } else if (error) {
        throw error
      }

      if (data) {
        saveStaffPin(data.id, data.email || staff.email, data.phone || staff.phone, pinCode)
        data.pin_code = pinCode
      }

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
      const pinCode = updates.pin_code
      if (pinCode) {
        saveStaffPin(id, updates.email, updates.phone, pinCode)
      }

      let data = null
      let error = null

      try {
        const res = await supabase
          .from('staff')
          .update(updates)
          .eq('id', id)
          .select()
          .single()
        data = res.data
        error = res.error
      } catch (e) {
        error = e
      }

      // If remote Supabase schema does not have 'pin_code' column in Postgres cache, retry safely without it
      if (error && (
        error.message?.includes('pin_code') ||
        error.message?.includes('schema cache') ||
        error.code === 'PGRST204' ||
        error.code === '42703'
      )) {
        const { pin_code: _discarded, ...safeUpdates } = updates
        const retryRes = await supabase
          .from('staff')
          .update(safeUpdates)
          .eq('id', id)
          .select()
          .single()
        if (retryRes.error) throw retryRes.error
        data = retryRes.data
      } else if (error) {
        throw error
      }

      if (data && pinCode) {
        data.pin_code = pinCode
      }

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

