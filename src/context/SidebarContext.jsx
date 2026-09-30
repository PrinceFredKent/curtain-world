// src/context/SidebarContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'

const SidebarContext = createContext(null)

export function SidebarProvider({ children }) {
  // On desktop: persisted collapsed state (defaults to false = expanded)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('cw_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  // On mobile / small screens: toggle overlay drawer
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('cw_sidebar_collapsed', String(collapsed))
    } catch {
      // ignore
    }
  }, [collapsed])

  const toggleCollapsed = () => setCollapsed(prev => !prev)
  const toggleMobile = () => setMobileOpen(prev => !prev)
  const closeMobile = () => setMobileOpen(false)

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed,
        toggleCollapsed,
        mobileOpen,
        setMobileOpen,
        toggleMobile,
        closeMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
