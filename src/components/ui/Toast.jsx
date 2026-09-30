// src/components/ui/Toast.jsx
import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '../../lib/utils'

const ToastContext = createContext(null)
let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ type = 'success', message, duration = 4000 }) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onRemove }) {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />,
    error:   <XCircle    className="h-5 w-5 text-red-500    shrink-0" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />,
  }

  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg border"
      style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--fg)' }}
    >
      {icons[toast.type]}
      <p className="text-sm flex-1">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        style={{ color: 'var(--fg-subtle)' }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
