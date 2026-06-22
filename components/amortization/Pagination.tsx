"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * A minimal, generic pager — knows nothing about amortization rows or any
 * other data shape. Pages are 1-indexed throughout, matching how page
 * numbers are conventionally displayed to users.
 */
export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t border-rule pt-3 text-sm"
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrevious}
        className="rounded-sm border border-rule px-3 py-1.5 text-ink-soft transition-colors hover:border-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink-soft"
      >
        Previous
      </button>

      <span className="text-ink-soft" aria-live="polite">
        Page <span className="font-mono tabular-nums text-ink">{currentPage}</span> of{" "}
        <span className="font-mono tabular-nums text-ink">{totalPages}</span>
      </span>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        className="rounded-sm border border-rule px-3 py-1.5 text-ink-soft transition-colors hover:border-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink-soft"
      >
        Next
      </button>
    </nav>
  );
}
