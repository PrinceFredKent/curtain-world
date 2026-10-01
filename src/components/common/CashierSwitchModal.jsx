// src/components/common/CashierSwitchModal.jsx
import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { useAllStaff } from '../../hooks/useStaff'
import { useToast } from '../ui/Toast'
import { Check, Crown } from 'lucide-react'

import { isCashierOrAdmin } from '../../lib/utils'

export function CashierSwitchModal({ open, onClose }) {
  const { user, fullName, activeCashierId, setActiveCashierId } = useAuth()
  const { data: staffList } = useAllStaff()
  const toast = useToast()

  const allActiveStaff = (staffList || []).filter(s => s.active !== false)
  // Only display staff recorded as "cashier", "admin", "super_admin", or "both" (sales & cashier)
  const cashierStaff = allActiveStaff.filter(isCashierOrAdmin)
  const displayStaff = cashierStaff.length > 0 ? cashierStaff : allActiveStaff
  const currentActiveId = activeCashierId || user?.id

  const handleSelectCashier = (staff) => {
    setActiveCashierId(staff.id)
    toast({
      type: 'success',
      message: `Active Cashier switched to ${staff.name}`,
    })
    onClose()
  }

  const handleResetToSelf = () => {
    if (user?.id) {
      setActiveCashierId(user.id)
      toast({
        type: 'success',
        message: `Active Cashier reset to ${fullName || 'logged-in account'}`,
      })
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Switch Active Cashier / Register Shift" size="md">
      <div className="space-y-4">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          Select which staff member is currently operating the cash register and collecting customer payments. All new payments, order deposits, and WhatsApp receipts will automatically attribute to this cashier.
        </p>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {displayStaff.map((st) => {
            const isSelected = st.id === currentActiveId
            const isMe = st.id === user?.id
            const isSuper = st.role === 'super_admin' || st.email === 'sharityra41@gmail.com'

            const roleLabel = {
              super_admin: 'Super Admin',
              admin: 'Store Admin',
              employee: 'Sales',
              cashier: 'Cashier',
              both: 'Sales & Cashier',
              workshop: 'Workshop',
              installer: 'Installer',
            }[st.role] || 'Staff'

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => handleSelectCashier(st)}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-purple-500 bg-purple-500/10 shadow-xs ring-1 ring-purple-500'
                    : 'hover:bg-purple-500/5 hover:border-purple-300 dark:hover:border-purple-800'
                }`}
                style={{
                  background: isSelected ? undefined : 'var(--surface-hover)',
                  borderColor: isSelected ? undefined : 'var(--border)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
                    style={{
                      background: isSuper ? 'rgba(245, 158, 11, 0.2)' : 'var(--brand-light)',
                      color: isSuper ? '#d97706' : 'var(--brand)',
                    }}
                  >
                    {isSuper ? <Crown className="h-4 w-4" /> : (st.name?.charAt(0).toUpperCase() || 'S')}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm truncate" style={{ color: 'var(--fg)' }}>
                        {st.name}
                      </span>
                      {isMe && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-purple-500/20 text-purple-600 dark:text-purple-300">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {roleLabel}
                      </span>
                      {st.phone && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="text-xs font-mono" style={{ color: 'var(--fg-subtle)' }}>
                            {st.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {isSelected ? (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white font-bold text-xs shadow-xs">
                      <Check className="h-3.5 w-3.5" />
                      <span>Active</span>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold hover:underline text-purple-600 dark:text-purple-400">
                      Switch
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="pt-2 flex items-center justify-between border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={handleResetToSelf}
            className="text-xs font-medium hover:underline text-purple-600 dark:text-purple-400 cursor-pointer"
          >
            Reset to My Account
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
