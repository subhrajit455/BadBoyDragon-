import React from 'react';

export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded border border-border bg-surface shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`border-b border-border px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`border-t border-border px-6 py-4 bg-slate-50 rounded-b ${className}`}>
      {children}
    </div>
  );
}

