import React, { forwardRef } from 'react';

const Select = forwardRef(
  (
    {
      label,
      error,
      id,
      name,
      options = [],
      placeholder = 'Select an option',
      className = '',
      wrapperClassName = '',
      required = false,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || name;

    // Check if children already include an option with value="" or empty value
    const hasEmptyOptionInChildren = React.Children.toArray(children).some(
      (child) =>
        React.isValidElement(child) &&
        (child.props?.value === '' || child.props?.value === undefined)
    );

    const showPlaceholder = placeholder && !hasEmptyOptionInChildren;

    return (
      <div className={`space-y-1.5 ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-text text-left"
          >
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          name={name}
          className={`w-full rounded border bg-surface px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-text placeholder-muted shadow-sm transition-colors text-left focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-muted ${
            error ? 'border-danger focus:border-danger focus:ring-danger' : 'border-border'
          } ${className}`}
          {...props}
        >
          {showPlaceholder && <option value="">{placeholder}</option>}
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value ?? opt} value={opt.value ?? opt}>
                  {opt.label ?? opt}
                </option>
              ))
            : children}
        </select>
        {error && (
          <p className="text-xs text-danger font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;

