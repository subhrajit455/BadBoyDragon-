import React from 'react';
import Card, { CardBody } from './Card';
import Spinner from './Spinner';
import EmptyState from './EmptyState';

/**
 * Reusable list component that renders a stacked card layout below `md` (768px),
 * and a standard clean table from `md` and up.
 */
export default function ResponsiveList({
  data = [],
  columns = [],
  renderMobileCard,
  keyExtractor = (item, index) => item?._id || index,
  onRowClick,
  loading = false,
  emptyState,
  className = '',
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-surface rounded-lg border border-border">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    if (emptyState) return emptyState;
    return <EmptyState title="No items found" description="There are no records to display." />;
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile Card Layout (< 768px) */}
      <div className="block md:hidden space-y-3">
        {data.map((item, index) => {
          const key = keyExtractor(item, index);
          if (renderMobileCard) {
            return (
              <div
                key={key}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={onRowClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}
              >
                {renderMobileCard(item, index)}
              </div>
            );
          }

          // Fallback mobile card if no custom mobile renderer provided
          return (
            <Card
              key={key}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={`hover:border-primary/40 transition-colors ${
                onRowClick ? 'cursor-pointer active:bg-slate-50' : ''
              }`}
            >
              <CardBody className="p-3.5 space-y-2">
                {columns.map((col, cIdx) => {
                  const val =
                    typeof col.accessor === 'function'
                      ? col.accessor(item)
                      : item[col.accessor];

                  if (cIdx === 0) {
                    return (
                      <div key={cIdx} className="font-semibold text-sm text-text">
                        {val}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cIdx}
                      className="flex items-center justify-between text-xs py-0.5 border-t border-slate-100 first:border-0"
                    >
                      <span className="text-muted font-medium">{col.header}:</span>
                      <span
                        className={`${col.isNumeric ? 'tabular-nums font-medium text-right' : 'text-text'}`}
                      >
                        {val}
                      </span>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Desktop / Tablet Table Layout (>= 768px) */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-surface shadow-xs">
        <table className="w-full text-left text-sm text-text border-collapse">
          <thead className="border-b border-border bg-slate-50 text-xs font-semibold text-muted uppercase tracking-wider">
            <tr>
              {columns.map((col, idx) => {
                const alignClass = {
                  left: 'text-left',
                  center: 'text-center',
                  right: 'text-right',
                }[col.align] || (col.isNumeric ? 'text-right' : 'text-left');

                return (
                  <th
                    key={idx}
                    scope="col"
                    className={`px-4 py-3.5 ${alignClass} ${col.headerClassName || ''}`}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item, rowIdx) => {
              const rowKey = keyExtractor(item, rowIdx);
              return (
                <tr
                  key={rowKey}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={`transition-colors hover:bg-slate-50/75 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col, colIdx) => {
                    const alignClass = {
                      left: 'text-left',
                      center: 'text-center',
                      right: 'text-right',
                    }[col.align] || (col.isNumeric ? 'text-right' : 'text-left');

                    const cellContent =
                      typeof col.accessor === 'function'
                        ? col.accessor(item)
                        : item[col.accessor];

                    return (
                      <td
                        key={colIdx}
                        className={`px-4 py-3.5 whitespace-nowrap ${alignClass} ${
                          col.isNumeric ? 'tabular-nums' : ''
                        } ${col.className || ''}`}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

