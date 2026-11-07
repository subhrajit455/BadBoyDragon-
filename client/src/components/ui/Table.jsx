import React from 'react';

export function TableWrapper({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded border border-border bg-surface shadow-sm ${className}`}>
      <table className="w-full text-left text-sm text-text border-collapse">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className = '' }) {
  return (
    <thead className={`border-b border-border bg-slate-50 text-xs font-semibold text-muted uppercase tracking-wider ${className}`}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '' }) {
  return <tbody className={`divide-y divide-border ${className}`}>{children}</tbody>;
}

export function TableRow({ children, className = '', onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors hover:bg-slate-50/75 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableHeader({ children, align = 'left', className = '' }) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align] || 'text-left';

  return (
    <th scope="col" className={`px-4 py-3 ${alignClass} ${className}`}>
      {children}
    </th>
  );
}

export function TableCell({ children, align = 'left', isNumeric = false, className = '' }) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align] || (isNumeric ? 'text-right' : 'text-left');

  return (
    <td className={`px-4 py-3.5 whitespace-nowrap ${alignClass} ${isNumeric ? 'tabular-nums font-mono' : ''} ${className}`}>
      {children}
    </td>
  );
}

