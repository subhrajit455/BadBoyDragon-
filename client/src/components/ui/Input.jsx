import React, { forwardRef } from 'react';

const Input = forwardRef(
  (
    {
      label,
      error,
      id,
      name,
      type = 'text',
      className = '',
      wrapperClassName = '',
      required = false,
      rightElement,
      ...props
    },
    ref
  ) => {
    const inputId = id || name;

    return (
      <div className={`space-y-1.5 ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text text-left"
          >
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            className={`w-full rounded border bg-surface px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-text placeholder-muted shadow-sm transition-colors text-left focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-muted ${
              error ? 'border-danger focus:border-danger focus:ring-danger' : 'border-border'
            } ${rightElement ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-danger font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

