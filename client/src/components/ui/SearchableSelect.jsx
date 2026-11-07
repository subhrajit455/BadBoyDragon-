import React, { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({
  label,
  name,
  value,
  onChange,
  placeholder = 'Search or select...',
  loading = false,
  options = [],
  onSearch,
  error,
  required = false,
  className = '',
  getLabel = (o) => (typeof o === 'string' ? o : o.label ?? o),
  getValue = (o) => (typeof o === 'string' ? o : o.value ?? o),
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const timer = useRef(null);

  const match = options.find((o) => getValue(o) === value);
  const displayLabel = typeof value === 'string' ? value : match ? getLabel(match) : value || '';

  useEffect(() => {
    if (!onSearch) return;
    timer.current = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(timer.current);
  }, [query, onSearch]);

  const filtered = options.filter((o) =>
    String(getLabel(o)).toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (opt) => {
    const val = getValue(opt);
    setQuery(getLabel(opt));
    setOpen(false);
    if (inputRef.current) inputRef.current.blur();
    onChange(val);
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    onChange(val);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-text text-left">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={name}
          name={name}
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full rounded border bg-surface px-3 py-2 min-h-[44px] text-[16px] text-text placeholder-muted shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-muted"
          placeholder={placeholder}
        />
        {loading && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            <span className="text-[10px] text-muted animate-spin">loading</span>
          </div>
        )}
      </div>
      {open && (
        <div className="absolute z-20 w-full mt-1 rounded border border-border bg-surface shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-muted">No matches found</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={getValue(opt)}
                type="button"
                onClick={() => handleSelect(opt)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-slate-50"
              >
                {getLabel(opt)}
              </button>
            ))
          )}
        </div>
      )}
      {error && <p className="text-[12px] text-danger font-medium">{error}</p>}
    </div>
  );
}

SearchableSelect.displayName = 'SearchableSelect';
