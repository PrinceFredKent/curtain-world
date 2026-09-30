// src/components/layout/BottomNav.jsx
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Menu,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSidebar } from '../../context/SidebarContext'
import { useAllStaff } from '../../hooks/useStaff'
import { WaterRipple } from '../ui/WaterRipple'
import { cn } from '../../lib/utils'

// Primary quick-access routes on the bottom bar
const primaryNavItems = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/customers', label: 'Clients', icon: Users },
]

export function BottomNav() {
  const { toggleMobile } = useSidebar()
  const { isSuperAdmin } = useAuth()
  const { data: staffList } = useAllStaff()

  const pendingCount = isSuperAdmin
    ? (staffList || []).filter(
        s => s.verified === false || s.status === 'pending_verification' || !s.role || s.role === 'pending'
      ).length
    : 0

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-lg safe-area-bottom shadow-lg"
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="grid grid-cols-4 items-center px-4 py-1.5 max-w-md mx-auto">
        {primaryNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="block text-center select-none"
          >
            {({ isActive }) => (
              <WaterRipple
                className={cn(
                  'flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-200 relative',
                  'active:scale-90',
                  isActive ? 'text-[var(--brand)] font-semibold' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                )}
                color={isActive ? 'rgba(124, 58, 237, 0.25)' : 'rgba(167, 139, 250, 0.2)'}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className={cn(
                      'p-1.5 rounded-xl transition-all duration-300',
                      isActive ? 'bg-[var(--brand-light)] shadow-xs scale-105' : 'bg-transparent'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 transition-transform duration-200',
                        isActive && 'scale-110 text-[var(--brand)]'
                      )}
                    />
                  </div>
                </div>

                <span className="text-[11px] mt-0.5 truncate tracking-tight font-medium">
                  {label}
                </span>

                {/* Active water drop indicator */}
                {isActive && (
                  <span
                    className="absolute bottom-0 h-1 w-5 rounded-full water-plop"
                    style={{ background: 'var(--brand)' }}
                  />
                )}
              </WaterRipple>
            )}
          </NavLink>
        ))}

        {/* "More / Menu" button opening the Slide-in Drawer with the other routes */}
        <button
          type="button"
          onClick={toggleMobile}
          className="block text-center select-none cursor-pointer"
        >
          <WaterRipple
            className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg)] active:scale-90 relative"
            color="rgba(167, 139, 250, 0.2)"
          >
            <div className="relative flex items-center justify-center">
              <div className="p-1.5 rounded-xl bg-transparent">
                <Menu className="h-5 w-5" />
              </div>

              {/* Notification dot if super admin has pending staff */}
              {isSuperAdmin && pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3 min-w-[12px] px-1 rounded-full text-[8px] font-bold bg-amber-500 text-white flex items-center justify-center shadow-xs animate-bounce">
                  {pendingCount}
                </span>
              )}
            </div>

            <span className="text-[11px] mt-0.5 truncate tracking-tight font-medium">
              More
            </span>
          </WaterRipple>
        </button>
      </div>
    </nav>
  )
}
