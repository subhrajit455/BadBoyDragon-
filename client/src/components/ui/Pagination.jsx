import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  total = 0,
  limit = 20,
  className = '',
}) {
  if (totalPages <= 1 && total <= limit) return null;

  const page = Math.max(1, Number(currentPage) || 1);
  const maxPages = Math.max(1, Number(totalPages) || 1);

  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = total > 0 ? Math.min(page * limit, total) : 0;

  // Generate page numbers with ellipses on desktop
  const getPageNumbers = () => {
    const pages = [];
    if (maxPages <= 7) {
      for (let i = 1; i <= maxPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(maxPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (page < maxPages - 2) pages.push('...');
      if (!pages.includes(maxPages)) pages.push(maxPages);
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border mt-4 ${className}`}
      aria-label="Pagination Navigation"
    >
      {/* Items count on tablet/desktop */}
      <div className="text-xs text-muted tabular-nums order-2 sm:order-1 text-center sm:text-left">
        {total > 0 ? (
          <>
            Showing <span className="font-semibold text-text">{startItem}</span> to{' '}
            <span className="font-semibold text-text">{endItem}</span> of{' '}
            <span className="font-semibold text-text">{total}</span> results
          </>
        ) : (
          <span>Page {page} of {maxPages}</span>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-end">
        {/* Previous Button */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="min-h-[44px] min-w-[80px] gap-1"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Prev</span>
        </Button>

        {/* Mobile current page indicator */}
        <div className="sm:hidden text-xs font-semibold text-text tabular-nums px-2">
          Page {page} of {maxPages}
        </div>

        {/* Desktop Page Numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-muted">
                  ...
                </span>
              );
            }
            const isCurrent = p === page;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                className={`min-h-[36px] min-w-[36px] rounded text-xs font-medium transition-colors tabular-nums ${
                  isCurrent
                    ? 'bg-primary text-white font-semibold shadow-xs'
                    : 'text-text hover:bg-slate-100 border border-transparent'
                }`}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Go to page ${p}`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= maxPages}
          className="min-h-[44px] min-w-[80px] gap-1"
          aria-label="Go to next page"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

