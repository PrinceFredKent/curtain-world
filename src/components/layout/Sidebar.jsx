// src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, ShoppingBag, ArrowUpDown,
  BarChart3, UserCog, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/transactions', label: 'Transactions', icon: ArrowUpDown },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/staff', label: 'Staff', icon: UserCog },
]

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg shadow"
        style={{ background: 'var(--brand)', color: 'var(--brand-fg)' }}
        onClick={() => setMobileOpen(v => !v)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-screen w-64 flex flex-col z-40 transition-transform border-r',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Brand */}
        <div
          className="px-6 py-7 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Purple gradient pill logo */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3"
            style={{ background: 'var(--brand-light)' }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: 'var(--brand)' }}
            />
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--brand)' }}>
              CW
            </span>
          </div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
            Curtain World
          </h1>
          <p className="text-xs mt-0.5 italic" style={{ color: 'var(--brand)' }}>
            For your curtain desires.
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className="block"
            >
              {({ isActive }) => (
                <span
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={
                    isActive
                      ? {
                          background: 'var(--brand-light)',
                          color: 'var(--brand)',
                        }
                      : {
                          color: 'var(--fg-muted)',
                        }
                  }
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = 'var(--surface-hover)'
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t"
          style={{ borderColor: 'var(--border)', color: 'var(--fg-subtle)' }}
        >
          <p className="text-xs">© {new Date().getFullYear()} Curtain World</p>
        </div>
      </aside>
    </>
  )
}
