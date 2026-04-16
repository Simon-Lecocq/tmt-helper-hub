import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto flex items-start gap-3 max-w-sm w-full px-4 py-3 rounded-xl shadow-lg
              animate-slide-up border
              ${t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : ''}
              ${t.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800' : ''}
              ${t.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' : ''}
              ${t.type === 'info'    ? 'bg-blue-50 border-blue-200 text-blue-800' : ''}
            `}
          >
            <span className="text-lg leading-none mt-0.5">
              {t.type === 'success' && '✅'}
              {t.type === 'error'   && '❌'}
              {t.type === 'warning' && '⚠️'}
              {t.type === 'info'    && 'ℹ️'}
            </span>
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="text-current opacity-50 hover:opacity-100 transition-opacity text-lg leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé dans un ToastProvider')
  return ctx
}
