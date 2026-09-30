// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

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

  const signUp = async ({ email, phone, identifier, password, fullName, role = 'employee' }) => {
    const userEmail = email || (identifier?.includes('@') ? identifier : `${(identifier || phone || fullName).replace(/\s+/g, '').toLowerCase()}@curtainworld.ug`)
    const userPhone = phone || (!identifier?.includes('@') ? identifier : undefined)

    const { data, error } = await supabase.auth.signUp({
      email: userEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          phone: userPhone,
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
          role,
          active: true,
        })
      }
    } catch (e) {
      console.warn('Could not auto-insert to staff table:', e)
    }

    setUser(data.user)
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

  const role = user?.user_metadata?.role || 'both'
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Staff Member'

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        fullName,
        loading,
        signIn,
        signUp,
        signOut,
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
