import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-2xl',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog: Bottom sheet on mobile (<sm), centered modal on sm+ */}
      <div
        className={`relative w-full ${maxWidth} rounded-t-2xl sm:rounded-xl border-t sm:border border-border bg-surface shadow-2xl z-10 max-h-[92dvh] sm:max-h-[88vh] flex flex-col my-0 sm:my-8 transition-transform animate-in slide-in-from-bottom sm:slide-in-from-bottom-2`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-6 sm:py-4 flex-shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="text-base sm:text-lg font-bold text-text truncate">{title}</h3>
            {description && (
              <p className="mt-0.5 text-xs text-muted truncate">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-text transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
}

