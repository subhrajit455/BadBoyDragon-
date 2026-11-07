import React from 'react';

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) {
  const variants = {
    default: 'bg-slate-100 text-text border border-border',
    success: 'bg-emerald-50 text-success border border-emerald-200',
    danger: 'bg-red-50 text-danger border border-red-200',
    warning: 'bg-amber-50 text-warning border border-amber-200',
    info: 'bg-blue-50 text-info border border-blue-200',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${
        variants[variant] || variants.default
      } ${sizes[size] || sizes.md} ${className}`}
    >
      {children}
    </span>
  );
}

