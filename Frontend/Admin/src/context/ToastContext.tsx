import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title?: string
  message: string
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = { id, message, type, title }
    setToasts(prev => [...prev, newToast])

    setTimeout(() => {
      removeToast(id)
    }, 4000)
  }, [removeToast])

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
      case 'info':
      default:
        return <Info className="w-5 h-5 text-orbit-primary-light shrink-0" />
    }
  }

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-300 dark:border-emerald-500/30 bg-white dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 shadow-xl'
      case 'error':
        return 'border-rose-300 dark:border-rose-500/30 bg-white dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 shadow-xl'
      case 'warning':
        return 'border-amber-300 dark:border-amber-500/30 bg-white dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-xl'
      case 'info':
      default:
        return 'border-orbit-primary/30 dark:border-orbit-primary/30 bg-white dark:bg-orbit-primary/10 text-orbit-primary dark:text-orbit-primary-light shadow-xl'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Render Portal Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 transform translate-y-0 animate-in slide-in-from-bottom-2 ${getBorderColor(toast.type)}`}
          >
            {getIcon(toast.type)}
            <div className="flex-1">
              {toast.title && <p className="font-semibold text-sm leading-tight mb-0.5 text-slate-900 dark:text-slate-100">{toast.title}</p>}
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
