// src/components/layout/MobileTopBar.jsx
import { useState } from 'react'
import { Crown, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSidebar } from '../../context/SidebarContext'
import { useAllStaff } from '../../hooks/useStaff'
import { Badge } from '../ui/Badge'
import { CashierSwitchModal } from '../common/CashierSwitchModal'

export function MobileTopBar() {
  const { user, fullName, role, isSuperAdmin, activeCashierId } = useAuth()
  const { toggleMobile } = useSidebar()
  const { data: staffList } = useAllStaff()
  const [showCashierModal, setShowCashierModal] = useState(false)

  const activeCashierStaff = (staffList || []).find(s => s.id === activeCashierId)

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
      <header
        className="md:hidden sticky top-0 z-30 px-3.5 py-2.5 flex items-center justify-between border-b backdrop-blur-md"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Side menu trigger & Brand */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMobile}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer relative"
            aria-label="Open navigation drawer"
            title="Open side menu"
          >
            <Menu className="h-5 w-5" />
            {isSuperAdmin && pendingCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <div
              className="inline-flex items-center justify-center h-8 w-8 rounded-xl shadow-xs"
              style={{ background: 'var(--brand-light)' }}
            >
              <span className="text-xs font-black tracking-wider uppercase" style={{ color: 'var(--brand)' }}>
                CW
              </span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight leading-tight" style={{ color: 'var(--fg)' }}>
                Curtain World
              </h1>
              <p className="text-[10px] italic leading-none" style={{ color: 'var(--brand)' }}>
                For your curtain desires.
              </p>
            </div>
          </div>
        </div>

        {/* Cashier Shift Switcher on Mobile Topbar */}
        {user && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCashierModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-left cursor-pointer transition-all hover:scale-102 active:scale-95 shadow-xs"
              style={{
                background: 'var(--surface-hover)',
                borderColor: 'var(--border)',
              }}
              title="Click to switch active cashier"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <div className="text-right">
                <p className="text-[9px] uppercase font-bold tracking-wider leading-none" style={{ color: 'var(--fg-muted)' }}>
                  Cashier
                </p>
                <p className="text-xs font-bold leading-tight truncate max-w-[80px]" style={{ color: 'var(--fg)' }}>
                  {activeCashierStaff?.name?.split(' ')[0] || fullName?.split(' ')[0] || 'Cashier'}
                </p>
              </div>
            </button>

            <div
              className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
              style={{
                background: isSuperAdmin ? 'rgba(245, 158, 11, 0.2)' : 'var(--brand-light)',
                color: isSuperAdmin ? '#d97706' : 'var(--brand)',
              }}
            >
              {isSuperAdmin ? <Crown className="h-3.5 w-3.5" /> : (fullName?.charAt(0).toUpperCase() || 'U')}
            </div>
          </div>
        )}
      </header>

      <CashierSwitchModal
        open={showCashierModal}
        onClose={() => setShowCashierModal(false)}
      />
    </>
  )
}

