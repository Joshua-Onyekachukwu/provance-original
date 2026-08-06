import { createContext, useContext } from 'react'

/**
 * Toast context + hook — split from Toast.jsx so the provider file only
 * exports a component (react-refresh/only-export-components compliance).
 */
export const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
