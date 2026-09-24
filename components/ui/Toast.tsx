'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// Individual toast item
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration || 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, toast.duration, onRemove]);

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const config: Record<ToastType, {
    icon: React.ReactNode;
    bg: string;
    border: string;
    iconBg: string;
    text: string;
  }> = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-white',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-50',
      text: 'text-gray-800',
    },
    error: {
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
      bg: 'bg-white',
      border: 'border-red-200',
      iconBg: 'bg-red-50',
      text: 'text-gray-800',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      bg: 'bg-white',
      border: 'border-amber-200',
      iconBg: 'bg-amber-50',
      text: 'text-gray-800',
    },
    info: {
      icon: <Info className="w-5 h-5 text-blue-600" />,
      bg: 'bg-white',
      border: 'border-blue-200',
      iconBg: 'bg-blue-50',
      text: 'text-gray-800',
    },
  };

  const c = config[toast.type];

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg backdrop-blur-sm
        ${c.bg} ${c.border}
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-y-[-12px] scale-95' : 'opacity-100 translate-y-0 scale-100'}
      `}
      style={{ minWidth: '280px', maxWidth: '480px' }}
    >
      {/* Icon */}
      <div className={`w-8 h-8 rounded-full ${c.iconBg} flex items-center justify-center shrink-0`}>
        {c.icon}
      </div>

      {/* Message */}
      <p className={`text-sm font-medium ${c.text} flex-1`}>
        {toast.message}
      </p>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Provider component
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success', duration: number = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container — fixed top center */}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto animate-slide-down">
              <ToastItem toast={toast} onRemove={removeToast} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
