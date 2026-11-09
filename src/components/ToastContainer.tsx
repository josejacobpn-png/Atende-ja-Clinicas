'use client';

import React from 'react';
import { useQueue } from '@/context/QueueContext';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useQueue();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full p-4 pointer-events-none">
      {toasts.map((toast) => {
        let bgColor = 'bg-card text-card-foreground border-border';
        let icon = <Info className="h-5 w-5 text-primary" />;

        switch (toast.type) {
          case 'success':
            bgColor = 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200';
            icon = <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
            break;
          case 'info':
            bgColor = 'bg-sky-50 dark:bg-sky-950 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200';
            icon = <Info className="h-5 w-5 text-sky-500" />;
            break;
          case 'warning':
            bgColor = 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200';
            icon = <AlertTriangle className="h-5 w-5 text-amber-500" />;
            break;
          case 'error':
            bgColor = 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
            icon = <XCircle className="h-5 w-5 text-red-500" />;
            break;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg ${bgColor} transform transition-all duration-300 translate-y-0 opacity-100 slide-in-bottom`}
            role="alert"
          >
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 text-sm font-medium">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 ml-auto text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
