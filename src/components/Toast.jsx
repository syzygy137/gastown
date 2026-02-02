import React, { createContext, useContext, useCallback, useState, useRef } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  mail: '\u2709',
  state: '\u2699',
  success: '\u2714',
  error: '\u2718',
  info: '\u26A0',
};

function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [toast.id, onDismiss]);

  // Auto-dismiss after duration
  const timerRef = useRef(null);
  if (!timerRef.current) {
    timerRef.current = setTimeout(handleDismiss, toast.duration || 4000);
  }

  return (
    <div
      className={`toast toast--${toast.variant || 'info'} ${exiting ? 'toast--exit' : ''}`}
      onClick={handleDismiss}
    >
      <span className="toast__icon">{ICONS[toast.variant] || ICONS.info}</span>
      <div className="toast__body">
        <div className="toast__title">{toast.title}</div>
        {toast.message && <div className="toast__message">{toast.message}</div>}
      </div>
    </div>
  );
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = ++toastId;
    setToasts(prev => [...prev.slice(-4), { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
