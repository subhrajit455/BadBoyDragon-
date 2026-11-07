import React from 'react';

export default function PageHeader({ title, description, actions, action, children }) {
  const headerActions = actions || action || children;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-text">{title}</h1>
        {description && (
          <p className="mt-0.5 text-xs sm:text-sm text-muted">{description}</p>
        )}
      </div>
      {headerActions && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto [&>button]:w-full [&>button]:sm:w-auto [&>a]:w-full [&>a]:sm:w-auto">
          {headerActions}
        </div>
      )}
    </div>
  );
}

