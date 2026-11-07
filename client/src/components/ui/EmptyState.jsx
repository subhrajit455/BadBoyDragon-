import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There are no records to display at this time.',
  actionLabel,
  onAction,
  action,
  children,
  className = '',
}) {
  const actionContent = action || children || (actionLabel && onAction && (
    <Button variant="primary" onClick={onAction}>
      {actionLabel}
    </Button>
  ));

  return (
    <div className={`flex flex-col items-center justify-center rounded border border-dashed border-border bg-surface p-12 text-center shadow-xs ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-muted mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-text">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {actionContent && (
        <div className="mt-6">
          {actionContent}
        </div>
      )}
    </div>
  );
}

