// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, SUPER_ADMIN_EMAIL } from '../lib/supabase'

const AuthContext = createContext(null)

export function isUserSuperAdmin(user) {
  if (!user) return false
  const email = (user.email || '').toLowerCase().trim()
  const role = user.user_metadata?.role || user.role
  return email === SUPER_ADMIN_EMAIL.toLowerCase() || role === 'super_admin'
}

export function isUserVerified(user) {
  if (!user) return false
  if (isUserSuperAdmin(user)) return true
  const verified = user.user_metadata?.verified === true || user.verified === true
  const role = user.user_metadata?.role || user.role
  return Boolean(verified && role && role !== 'pending')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser({ ...session.user })
        return session.user
      }
    } catch (e) {
      console.warn('Could not refresh user session:', e)
    }
    return null
  }, [])

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // 2. Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signIn = async (identifier, password) => {
    const isEmail = identifier.includes('@')
    const credentials = isEmail
      ? { email: identifier.trim(), password }
      : { phone: identifier.trim(), identifier: identifier.trim(), password }

    const { data, error } = await supabase.auth.signInWithPassword(credentials)
    if (error) throw error
    setUser(data.user)
    return data
  }

  const signUp = async (firstArg, secondArg, thirdArg) => {
    let email, phone, password, fullName, role

    if (typeof firstArg === 'object' && firstArg !== null) {
      email = firstArg.email || (firstArg.identifier?.includes('@') ? firstArg.identifier : `${(firstArg.identifier || firstArg.phone || firstArg.fullName).replace(/\s+/g, '').toLowerCase()}@curtainworld.ug`)
      phone = firstArg.phone || (!firstArg.identifier?.includes('@') ? firstArg.identifier : undefined)
      password = firstArg.password
      fullName = firstArg.fullName || firstArg.full_name
      role = firstArg.role
    } else {
      email = firstArg
      password = secondArg
      fullName = thirdArg?.full_name || thirdArg?.fullName
      phone = thirdArg?.phone
      role = thirdArg?.role
    }

    const cleanEmail = (email || '').trim().toLowerCase()
    const isSuper = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()
    const finalRole = isSuper ? 'super_admin' : (role || null)
    const verified = isSuper ? true : false

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          role: finalRole,
          phone: phone || '',
          verified,
          status: verified ? 'active' : 'pending_verification',
        },
      },
    })
    if (error) throw error

    // Sync into staff table if live Supabase is connected
    try {
      if (data.user) {
        await supabase.from('staff').insert({
          id: data.user.id,
          name: fullName,
          email: cleanEmail,
          phone: phone || '',
          role: finalRole,
          active: verified,
          verified,
          status: verified ? 'active' : 'pending_verification',
        })
      }
    } catch (e) {
      console.warn('Could not auto-insert to staff table:', e)
    }

    setUser(data.user)
    return data
  }

  const approveStaff = async (staffId, assignedRole) => {
    const { data, error } = await supabase
      .from('staff')
      .update({
        role: assignedRole,
        verified: true,
        active: true,
        status: 'active',
      })
      .eq('id', staffId)
      .select()
      .single()

    if (error) throw error

    // If current logged-in user was approved, refresh session
    if (user?.id === staffId) {
      await refreshUser()
    }
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  const isSuperAdmin = isUserSuperAdmin(user)
  const isVerified = isUserVerified(user)
  const role = isSuperAdmin ? 'super_admin' : (user?.user_metadata?.role || user?.role || null)
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Staff Member'
  const email = user?.email || ''
  const phone = user?.user_metadata?.phone || user?.phone || ''

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        fullName,
        email,
        phone,
        isSuperAdmin,
        isVerified,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUser,
        approveStaff,
        resetPassword,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

