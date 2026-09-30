// src/components/ui/Toast.jsx
import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'

const ToastContext = createContext(null)
let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ type = 'success', message, title, duration = 4500 }) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, type, message, title, duration }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onRemove }) {
  const configs = {
    success: {
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
      border: 'border-emerald-500/20',
      glow: 'rgba(16, 185, 129, 0.15)',
      accent: 'bg-emerald-500',
    },
    error: {
      icon: <XCircle className="h-5 w-5 text-rose-500 shrink-0" />,
      border: 'border-rose-500/20',
      glow: 'rgba(244, 63, 94, 0.15)',
      accent: 'bg-rose-500',
    },
    warning: {
      icon: <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />,
      border: 'border-amber-500/20',
      glow: 'rgba(245, 158, 11, 0.15)',
      accent: 'bg-amber-500',
    },
    info: {
      icon: <Info className="h-5 w-5 text-[var(--brand)] shrink-0" />,
      border: 'border-[var(--brand)]/20',
      glow: 'rgba(124, 58, 237, 0.15)',
      accent: 'bg-[var(--brand)]',
    },
  }

  const current = configs[toast.type] || configs.info

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-xl border backdrop-blur-md',
        'water-plop transition-all duration-300',
        current.border
      )}
      style={{
        background: 'var(--card)',
        color: 'var(--fg)',
        boxShadow: `0 10px 25px -5px ${current.glow}, 0 4px 6px -2px rgba(0, 0, 0, 0.1)`,
      }}
    >
      <div className="pt-0.5">{current.icon}</div>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="text-sm font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>
            {toast.title}
          </h4>
        )}
        <p className="text-sm leading-snug" style={{ color: 'var(--fg)' }}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 rounded-lg transition-colors cursor-pointer shrink-0"
        style={{ color: 'var(--fg-subtle)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
