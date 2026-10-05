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
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      bg: 'bg-white/95',
      border: 'border-emerald-200/90 shadow-emerald-500/5',
      iconBg: 'bg-emerald-50',
      text: 'text-gray-800',
    },
    error: {
      icon: <AlertCircle className="w-3.5 h-3.5 text-red-600" />,
      bg: 'bg-white/95',
      border: 'border-red-200/90 shadow-red-500/5',
      iconBg: 'bg-red-50',
      text: 'text-gray-800',
    },
    warning: {
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
      bg: 'bg-white/95',
      border: 'border-amber-200/90 shadow-amber-500/5',
      iconBg: 'bg-amber-50',
      text: 'text-gray-800',
    },
    info: {
      icon: <Info className="w-3.5 h-3.5 text-blue-600" />,
      bg: 'bg-white/95',
      border: 'border-blue-200/90 shadow-blue-500/5',
      iconBg: 'bg-blue-50',
      text: 'text-gray-800',
    },
  };

  const c = config[toast.type];

  return (
    <div
      className={`
        flex items-start gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border shadow-md backdrop-blur-md
        ${c.bg} ${c.border}
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 -translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'}
        w-[calc(100vw-24px)] max-w-sm sm:max-w-md
      `}
    >
      {/* Icon */}
      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${c.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
        {c.icon}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className={`text-xs sm:text-sm font-medium ${c.text} leading-snug break-words`}>
          {toast.message}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        aria-label="ปิดแจ้งเตือน"
        className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0 -mr-1 -mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
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
        <div className="fixed top-2.5 sm:top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-1.5 sm:gap-2 pointer-events-none px-3 w-full">
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
