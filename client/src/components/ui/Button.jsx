import React from 'react';
import Spinner from './Spinner';

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  onClick,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-primary text-white hover:bg-primary-hover focus:ring-primary shadow-sm',
    secondary:
      'bg-white text-text border border-border hover:bg-slate-50 focus:ring-slate-300 shadow-sm',
    danger:
      'bg-danger text-white hover:bg-red-800 focus:ring-danger shadow-sm',
    ghost:
      'bg-transparent text-muted hover:text-text hover:bg-slate-100 focus:ring-slate-300',
  };

  const sizes = {
    sm: 'text-xs px-3 py-2 min-h-[44px] sm:min-h-[32px] sm:py-1.5 sm:px-2.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] sm:min-h-[38px] sm:py-2 gap-2',
    lg: 'text-base px-5 py-3 min-h-[48px] sm:min-h-[44px] sm:py-2.5 gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${
        sizes[size] || sizes.md
      } ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-1" />}
      {children}
    </button>
  );
}

