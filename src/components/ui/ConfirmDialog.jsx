// src/components/ui/ConfirmDialog.jsx
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import {
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  X,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [dialogState, setDialogState] = useState(null)
  const resolverRef = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setDialogState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to proceed?',
        description: options.description || null,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'danger', // 'danger' | 'warning' | 'info' | 'primary'
        icon: options.icon || null,
        itemDetails: options.itemDetails || null, // { label, value, badge }
        warningNote: options.warningNote || null,
        isLoading: false,
      })
    })
  }, [])

  const handleClose = useCallback((result) => {
    if (resolverRef.current) {
      resolverRef.current(result)
      resolverRef.current = null
    }
    setDialogState(null)
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialogState && (
        <ConfirmDialogModal
          state={dialogState}
          onConfirm={() => handleClose(true)}
          onCancel={() => handleClose(false)}
        />
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}

export function ConfirmDialogModal({ state, onConfirm, onCancel }) {
  const {
    isOpen,
    title,
    message,
    description,
    confirmText,
    cancelText,
    variant = 'danger',
    icon: customIcon,
    itemDetails,
    warningNote,
  } = state

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  if (!isOpen) return null

  // Variant themes & icons
  const config = {
    danger: {
      accentColor: '#ef4444',
      iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      glow: '0 0 30px -5px rgba(239, 68, 68, 0.25)',
      buttonVariant: 'danger',
      DefaultIcon: AlertTriangle,
    },
    warning: {
      accentColor: '#f59e0b',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      glow: '0 0 30px -5px rgba(245, 158, 11, 0.25)',
      buttonVariant: 'primary',
      DefaultIcon: AlertCircle,
    },
    info: {
      accentColor: '#7c3aed',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      glow: '0 0 30px -5px rgba(124, 58, 237, 0.25)',
      buttonVariant: 'primary',
      DefaultIcon: HelpCircle,
    },
    primary: {
      accentColor: '#7c3aed',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      glow: '0 0 30px -5px rgba(124, 58, 237, 0.25)',
      buttonVariant: 'primary',
      DefaultIcon: CheckCircle2,
    },
  }[variant] || {
    accentColor: '#ef4444',
    iconBg: 'bg-red-500/10 text-red-600 border-red-500/20',
    glow: '0 0 30px -5px rgba(239, 68, 68, 0.25)',
    buttonVariant: 'danger',
    DefaultIcon: AlertTriangle,
  }

  const IconComponent = customIcon || config.DefaultIcon

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Liquid Backdrop Blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Dialog Card with Water-Plop Animation & Design Tokens */}
      <div
        className={cn(
          'relative w-full max-w-md rounded-2xl p-6 sm:p-7 shadow-2xl border flex flex-col',
          'water-plop transition-all duration-300 transform'
        )}
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--fg)',
          boxShadow: `${config.glow}, 0 20px 25px -5px rgba(0, 0, 0, 0.5)`,
        }}
      >
        {/* Close X button top right */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 rounded-xl p-1.5 transition-colors cursor-pointer"
          style={{ color: 'var(--fg-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon & Title Header */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border',
              config.iconBg
            )}
            style={{
              animation: 'water-drop-bounce 0.6s var(--ease-spring)',
            }}
          >
            <IconComponent className="h-6 w-6" />
          </div>

          <div className="flex-1 pt-0.5 pr-4">
            <h3
              id="confirm-dialog-title"
              className="text-lg sm:text-xl font-bold tracking-tight"
              style={{ color: 'var(--fg)' }}
            >
              {title}
            </h3>
            <p
              className="mt-1.5 text-sm leading-relaxed"
              style={{ color: 'var(--fg-muted)' }}
            >
              {message}
            </p>
          </div>
        </div>

        {/* Optional Item Details Card (e.g. Target staff/customer info) */}
        {itemDetails && (
          <div
            className="mt-4 rounded-xl p-3.5 border flex items-center justify-between gap-3 text-sm"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="truncate">
              {itemDetails.label && (
                <div className="text-xs uppercase font-medium tracking-wider" style={{ color: 'var(--fg-subtle)' }}>
                  {itemDetails.label}
                </div>
              )}
              <div className="font-semibold truncate" style={{ color: 'var(--fg)' }}>
                {itemDetails.value}
              </div>
              {itemDetails.subtext && (
                <div className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>
                  {itemDetails.subtext}
                </div>
              )}
            </div>
            {itemDetails.badge && (
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0"
                style={{
                  background: 'var(--brand-light)',
                  color: 'var(--brand)',
                }}
              >
                {itemDetails.badge}
              </span>
            )}
          </div>
        )}

        {/* Optional Warning / Consequence note */}
        {warningNote && (
          <div
            className="mt-4 rounded-xl p-3 flex items-start gap-2.5 text-xs border"
            style={{
              background: variant === 'danger' ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface)',
              borderColor: variant === 'danger' ? 'rgba(239, 68, 68, 0.2)' : 'var(--border)',
              color: variant === 'danger' ? 'var(--danger)' : 'var(--fg-muted)',
            }}
          >
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{warningNote}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="w-full sm:w-auto font-medium"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={config.buttonVariant}
            onClick={onConfirm}
            className="w-full sm:w-auto font-medium"
            autoFocus
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
