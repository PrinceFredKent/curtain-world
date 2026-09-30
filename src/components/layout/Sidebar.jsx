// src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  ArrowUpDown,
  BarChart3,
  UserCog,
  X,
  LogOut,
  Crown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSidebar } from '../../context/SidebarContext'
import { useAllStaff } from '../../hooks/useStaff'
import { Badge } from '../ui/Badge'
import { WaterRipple } from '../ui/WaterRipple'
import { useConfirm } from '../ui/ConfirmDialog'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/transactions', label: 'Transactions', icon: ArrowUpDown },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/staff', label: 'Staff', icon: UserCog, isStaff: true },
]

export function Sidebar() {
  const { collapsed, toggleCollapsed, mobileOpen, closeMobile } = useSidebar()
  const { user, fullName, role, isSuperAdmin, signOut } = useAuth()
  const { data: staffList } = useAllStaff()
  const confirm = useConfirm()

  const handleSignOut = async () => {
    const confirmed = await confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to end your current session?',
      confirmText: 'Sign Out',
      cancelText: 'Stay Logged In',
      variant: 'warning',
    })
    if (confirmed) {
      signOut()
    }
  }

  const pendingCount = isSuperAdmin
    ? (staffList || []).filter(
        s => s.verified === false || s.status === 'pending_verification' || !s.role || s.role === 'pending'
      ).length
    : 0

  const roleLabel = {
    super_admin: 'Super Admin',
    admin: 'Store Admin',
    employee: 'Sales',
    cashier: 'Cashier',
    both: 'Sales & Cashier',
    workshop: 'Workshop',
    installer: 'Installer',
  }[role] || 'Staff'

  const roleBadgeVariant = {
    super_admin: 'amber',
    admin: 'indigo',
    employee: 'blue',
    cashier: 'green',
    both: 'purple',
    workshop: 'orange',
    installer: 'cyan',
  }[role] || 'default'

  return (
    <>
      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden transition-opacity duration-300"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar panel with liquid spring physics */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-screen flex flex-col z-40 border-r liquid-sidebar shadow-md',
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0',
          collapsed ? 'md:w-20' : 'md:w-64'
        )}
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Brand Header */}
        <div
          className={cn(
            'border-b liquid-transition relative',
            collapsed ? 'p-3 flex flex-col items-center gap-2' : 'px-5 py-4 flex items-center justify-between'
          )}
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Logo & Brand Name */}
          <div className={cn('flex items-center min-w-0', collapsed ? 'justify-center' : 'gap-3')}>
            <div
              className="inline-flex items-center justify-center h-10 w-10 rounded-2xl shrink-0 shadow-xs cursor-pointer water-drop-press hover:rotate-2 transition-transform duration-300"
              style={{ background: 'var(--brand-light)' }}
              title="Curtain World"
            >
              <span className="text-xs font-black tracking-wider uppercase" style={{ color: 'var(--brand)' }}>
                CW
              </span>
            </div>

            {/* Expanded Brand Name with liquid fade */}
            <div
              className={cn(
                'min-w-0 transition-all duration-300 ease-out transform',
                collapsed ? 'opacity-0 scale-95 pointer-events-none md:hidden' : 'opacity-100 scale-100'
              )}
            >
              <h1 className="text-base font-bold tracking-tight truncate leading-tight" style={{ color: 'var(--fg)' }}>
                Curtain World
              </h1>
              <p className="text-[11px] truncate italic opacity-90" style={{ color: 'var(--brand)' }}>
                For your curtain desires.
              </p>
            </div>
          </div>

          {/* Desktop collapse / expand toggle button with fluid water drop press effect */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden md:flex p-2 rounded-xl transition-all duration-300 opacity-80 hover:opacity-100 hover:scale-110 active:scale-90 hover:bg-purple-500/10 cursor-pointer shadow-xs"
            style={{ color: 'var(--fg-muted)', background: 'var(--surface-hover)' }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 transition-transform duration-300 transform group-hover:translate-x-0.5" />
            ) : (
              <ChevronLeft className="h-4 w-4 transition-transform duration-300 transform group-hover:-translate-x-0.5" />
            )}
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={closeMobile}
            className="md:hidden p-1.5 rounded-lg transition-transform active:scale-90 text-gray-500 hover:bg-black/5"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items with Water Drop click ripple */}
        <nav className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ to, label, icon: Icon, end, isStaff }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeMobile}
              className="block group relative"
              title={collapsed ? label : undefined}
            >
              {({ isActive }) => (
                <WaterRipple
                  className={cn(
                    'flex items-center rounded-xl text-sm font-medium transition-all duration-200 relative select-none',
                    'hover:translate-x-1 active:scale-95',
                    collapsed ? 'md:justify-center md:px-0 py-2.5 hover:translate-x-0' : 'justify-between px-3.5 py-2.5'
                  )}
                  style={
                    isActive
                      ? {
                          background: 'var(--brand-light)',
                          color: 'var(--brand)',
                          boxShadow: '0 2px 8px -2px rgba(124, 58, 237, 0.25)',
                        }
                      : {
                          color: 'var(--fg-muted)',
                        }
                  }
                  color={isActive ? 'rgba(124, 58, 237, 0.25)' : 'rgba(167, 139, 250, 0.2)'}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = 'var(--surface-hover)'
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform duration-300 ease-out group-hover:scale-120 group-hover:rotate-3',
                          isActive && 'text-[var(--brand)] scale-110'
                        )}
                      />
                      {/* Collapsed notification droplet */}
                      {isStaff && pendingCount > 0 && collapsed && (
                        <span className="hidden md:block absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-[var(--surface)] animate-ping" />
                      )}
                      {isStaff && pendingCount > 0 && collapsed && (
                        <span className="hidden md:block absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-[var(--surface)]" />
                      )}
                    </div>

                    <span
                      className={cn(
                        'truncate transition-all duration-200',
                        collapsed && 'md:hidden'
                      )}
                    >
                      {label}
                    </span>
                  </div>

                  {/* Expanded notification droplet badge with count */}
                  {isStaff && pendingCount > 0 && (
                    <span
                      className={cn(
                        'h-5 px-2 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center justify-center shadow-xs water-bounce',
                        collapsed && 'md:hidden'
                      )}
                    >
                      {pendingCount}
                    </span>
                  )}

                  {/* Desktop Tooltip when collapsed */}
                  {collapsed && (
                    <div
                      className="hidden md:group-hover:flex absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl pointer-events-none z-50 items-center gap-2 border water-plop"
                      style={{
                        backgroundColor: 'var(--surface)',
                        color: 'var(--fg)',
                        borderColor: 'var(--border)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <span>{label}</span>
                      {isStaff && pendingCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-white font-bold">
                          {pendingCount}
                        </span>
                      )}
                    </div>
                  )}
                </WaterRipple>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Staff Profile & Logout Footer */}
        {user && (
          <div
            className={cn(
              'border-t liquid-transition',
              collapsed ? 'p-2 md:m-1.5' : 'p-3 m-2'
            )}
            style={{ borderColor: 'var(--border)' }}
          >
            <div
              className={cn(
                'rounded-xl border transition-all duration-300 flex items-center',
                collapsed ? 'p-1.5 md:justify-center' : 'p-2.5 justify-between gap-2 min-w-0'
              )}
              style={{
                backgroundColor: 'var(--surface-hover)',
                borderColor: 'var(--border)',
              }}
            >
              {/* User Avatar + Details */}
              <div className={cn('flex items-center min-w-0', collapsed ? 'md:justify-center' : 'gap-2.5')}>
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 relative transition-transform duration-300 hover:scale-110 active:scale-95 shadow-xs"
                  style={{
                    background: isSuperAdmin ? 'rgba(245, 158, 11, 0.2)' : 'var(--brand-light)',
                    color: isSuperAdmin ? '#d97706' : 'var(--brand)',
                  }}
                  title={`${fullName || 'Staff'} (${roleLabel})`}
                >
                  {isSuperAdmin ? <Crown className="h-3.5 w-3.5" /> : (fullName?.charAt(0).toUpperCase() || 'U')}
                </div>

                {/* Expanded name and role */}
                <div className={cn('min-w-0 flex-1 transition-opacity duration-200', collapsed && 'md:hidden')}>
                  <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--fg)' }}>
                    {fullName}
                  </p>
                  <div className="mt-0.5">
                    <Badge variant={roleBadgeVariant} className="text-[9px] px-1.5 py-0 font-medium">
                      {roleLabel}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={handleSignOut}
                className={cn(
                  'p-1.5 rounded-lg transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:scale-110 active:scale-90 shrink-0 cursor-pointer',
                  collapsed && 'md:hidden'
                )}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            {/* When collapsed on desktop: compact logout icon button directly below */}
            {collapsed && (
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden md:flex w-full mt-1.5 p-2 rounded-xl transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:scale-105 active:scale-90 items-center justify-center cursor-pointer shadow-xs"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
