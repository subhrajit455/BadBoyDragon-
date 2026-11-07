import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function Toast({
  message,
  type = 'info',
  onClose,
  className = '',
  duration = 4000,
}) {
  useEffect(() => {
    if (!message || !onClose || duration <= 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  const styles = {
    success: 'bg-emerald-50 text-success border-emerald-300',
    danger: 'bg-red-50 text-danger border-red-300',
    warning: 'bg-amber-50 text-warning border-amber-300',
    info: 'bg-blue-50 text-info border-blue-300',
  }[type] || 'bg-blue-50 text-info border-blue-300';

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />,
    danger: <AlertCircle className="h-4 w-4 text-danger flex-shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />,
    info: <Info className="h-4 w-4 text-info flex-shrink-0" />,
  };

  return (
    <div
      role="alert"
      className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 flex items-center justify-between rounded-lg border p-3.5 text-sm shadow-md transition-all animate-in fade-in slide-in-from-top-2 ${styles} ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {icons[type]}
        <span className="font-medium text-xs sm:text-sm truncate">{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-3 rounded p-1 hover:bg-black/5 transition-colors flex-shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

