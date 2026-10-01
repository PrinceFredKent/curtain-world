// src/components/common/CashierSwitchModal.jsx
import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { useAllStaff } from '../../hooks/useStaff'
import { useToast } from '../ui/Toast'
import { Check, Crown, Lock, ArrowLeft, Delete, KeyRound, ShieldAlert } from 'lucide-react'
import { isCashierOrAdmin } from '../../lib/utils'

export function CashierSwitchModal({ open, onClose }) {
  const { user, activeCashierId, setActiveCashierId } = useAuth()
  const { data: staffList } = useAllStaff()
  const toast = useToast()

  const [targetStaff, setTargetStaff] = useState(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Reset internal state when modal opens or closes
  useEffect(() => {
    if (!open) {
      setTargetStaff(null)
      setPinInput('')
      setPinError('')
      setIsVerifying(false)
    }
  }, [open])

  const allActiveStaff = (staffList || []).filter(s => s.active !== false)
  // Only display staff recorded as "cashier", "admin", "super_admin", or "both" (sales & cashier)
  const cashierStaff = allActiveStaff.filter(isCashierOrAdmin)
  const displayStaff = cashierStaff.length > 0 ? cashierStaff : allActiveStaff
  const currentActiveId = activeCashierId || user?.id

  const handleInitiateSwitch = (staff) => {
    if (staff.id === currentActiveId) {
      toast({ type: 'info', message: `${staff.name} is already the active register shift.` })
      return
    }

    // Always require PIN verification for every cashier/admin account switch
    setTargetStaff(staff)
    setPinInput('')
    setPinError('')
  }

  const handleVerifyPin = (overridePin = null) => {
    if (!targetStaff) return
    const entered = (overridePin !== null ? overridePin : pinInput).trim()
    const correctPin = String(targetStaff.pin_code || '1234').trim()

    if (!entered) {
      setPinError('Please enter the security PIN.')
      return
    }

    setIsVerifying(true)
    setTimeout(() => {
      if (entered === correctPin) {
        setActiveCashierId(targetStaff.id)
        toast({
          type: 'success',
          message: `PIN verified! Active Cashier switched to ${targetStaff.name}`,
        })
        onClose()
      } else {
        setPinError('Incorrect PIN. Please try again.')
        setPinInput('')
      }
      setIsVerifying(false)
    }, 150)
  }

  const handleNumpadPress = (digit) => {
    setPinError('')
    if (pinInput.length < 6) {
      const next = pinInput + String(digit)
      setPinInput(next)
      // Auto-submit when reaching target PIN length
      const expectedLength = String(targetStaff?.pin_code || '1234').length
      if (next.length === expectedLength) {
        handleVerifyPin(next)
      }
    }
  }

  const handleNumpadBackspace = () => {
    setPinError('')
    setPinInput(prev => prev.slice(0, -1))
  }

  const handleNumpadClear = () => {
    setPinError('')
    setPinInput('')
  }

  // View 2: PIN Verification Keypad
  if (targetStaff) {
    const isSuper = targetStaff.role === 'super_admin' || targetStaff.email === 'sharityra41@gmail.com'
    const expectedLength = String(targetStaff.pin_code || '1234').length

    return (
      <Modal
        open={open}
        onClose={() => {
          setTargetStaff(null)
          onClose()
        }}
        title="Enter Staff Security PIN"
        size="sm"
      >
        <div className="space-y-4 text-center">
          {/* Back button */}
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={() => {
                setTargetStaff(null)
                setPinInput('')
                setPinError('')
              }}
              className="inline-flex items-center gap-1 text-xs font-medium hover:underline text-purple-600 dark:text-purple-400 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Staff List
            </button>
          </div>

          {/* Target Staff Badge */}
          <div className="flex flex-col items-center gap-2 pt-1">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-md border-2 border-purple-500/30"
              style={{
                background: isSuper ? 'rgba(245, 158, 11, 0.2)' : 'var(--brand-light)',
                color: isSuper ? '#d97706' : 'var(--brand)',
              }}
            >
              {isSuper ? <Crown className="h-6 w-6" /> : (targetStaff.name?.charAt(0).toUpperCase() || 'S')}
            </div>

            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--fg)' }}>
                {targetStaff.name}
              </h3>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                {targetStaff.role === 'cashier' ? 'Cashier Shift' : 'Admin & Cashier'}
              </p>
            </div>
          </div>

          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            Enter {targetStaff.name}&apos;s {expectedLength}-digit PIN to authorize register access.
          </p>

          {/* PIN Dots Display */}
          <div className="flex items-center justify-center gap-3 py-2">
            {Array.from({ length: expectedLength }).map((_, idx) => {
              const isFilled = idx < pinInput.length
              return (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${
                    isFilled
                      ? 'bg-purple-600 border-purple-600 scale-110 shadow-xs'
                      : 'border-zinc-500/40 bg-zinc-500/10'
                  }`}
                />
              )
            })}
          </div>

          {/* Error Message */}
          {pinError && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500 font-medium flex items-center justify-center gap-1.5 animate-shake">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {/* On-screen Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumpadPress(num)}
                className="h-12 rounded-xl text-lg font-bold border transition-all active:scale-90 hover:bg-purple-500/10 cursor-pointer shadow-xs"
                style={{
                  background: 'var(--surface-hover)',
                  borderColor: 'var(--border)',
                  color: 'var(--fg)',
                }}
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={handleNumpadClear}
              className="h-12 rounded-xl text-xs font-semibold border transition-all active:scale-90 hover:bg-zinc-500/10 cursor-pointer"
              style={{
                background: 'var(--surface-hover)',
                borderColor: 'var(--border)',
                color: 'var(--fg-muted)',
              }}
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => handleNumpadPress(0)}
              className="h-12 rounded-xl text-lg font-bold border transition-all active:scale-90 hover:bg-purple-500/10 cursor-pointer shadow-xs"
              style={{
                background: 'var(--surface-hover)',
                borderColor: 'var(--border)',
                color: 'var(--fg)',
              }}
            >
              0
            </button>

            <button
              type="button"
              onClick={handleNumpadBackspace}
              className="h-12 rounded-xl text-xs font-semibold border transition-all active:scale-90 hover:bg-zinc-500/10 flex items-center justify-center cursor-pointer"
              style={{
                background: 'var(--surface-hover)',
                borderColor: 'var(--border)',
                color: 'var(--fg-muted)',
              }}
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          {/* Keyboard input fallback */}
          <input
            type="password"
            maxLength={6}
            value={pinInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, expectedLength)
              setPinInput(val)
              setPinError('')
              if (val.length === expectedLength) {
                handleVerifyPin(val)
              }
            }}
            placeholder="Or type PIN here..."
            className="w-full text-center tracking-widest text-sm py-2 px-3 rounded-lg border font-mono mt-2"
            style={{
              background: 'var(--surface-hover)',
              borderColor: 'var(--border)',
              color: 'var(--fg)',
            }}
            autoFocus
          />

          {/* Actions */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              disabled={isVerifying || pinInput.length === 0}
              onClick={() => handleVerifyPin()}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="h-4 w-4" />
              <span>{isVerifying ? 'Verifying...' : 'Verify PIN & Switch Cashier'}</span>
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  // View 1: Staff Selection List
  return (
    <Modal open={open} onClose={onClose} title="Switch Active Cashier / Register Shift" size="md">
      <div className="space-y-4">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          Select which staff member is operating the cash register. A security PIN is strictly required to verify identity before switching to any account.
        </p>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {displayStaff.map((st) => {
            const isSelected = st.id === currentActiveId
            const isSuper = st.role === 'super_admin' || st.email === 'sharityra41@gmail.com'

            const roleLabel = {
              super_admin: 'Super Admin',
              admin: 'Store Admin',
              employee: 'Sales Representative',
              cashier: 'Cashier',
              both: 'Sales & Cashier',
            }[st.role] || (st.role || 'Staff')

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => handleInitiateSwitch(st)}
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
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-400 font-mono">
                        <Lock className="h-2.5 w-2.5" /> PIN Protected
                      </span>
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
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-600/10 text-purple-600 dark:text-purple-400 hover:bg-purple-600/20">
                      <KeyRound className="h-3 w-3" />
                      Enter PIN
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="pt-2 flex items-center justify-end border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

