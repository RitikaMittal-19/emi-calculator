"use client";

import type { Prepayment } from "@/types/prepayment";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface PrepaymentListProps {
  prepayments: Prepayment[];
  onRemove: (id: string) => void;
}

/**
 * Lists currently-added prepayments sorted by month. Each row is removable
 * independently. Empty state is an invitation to act, per the writing
 * guidance — not just a bare "no data" message.
 */
export function PrepaymentList({ prepayments, onRemove }: PrepaymentListProps) {
  if (prepayments.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-rule px-3 py-4 text-center text-sm text-ink-soft">
        No prepayments yet. Add one above to see how it shortens your loan.
      </p>
    );
  }

  const sorted = [...prepayments].sort((a, b) => a.month - b.month);

  return (
    <ul className="flex flex-col">
      {sorted.map((prepayment) => (
        <li
          key={prepayment.id}
          className="flex items-center justify-between gap-3 border-b border-rule py-2.5 text-sm last:border-b-0"
        >
          <span className="text-ink-soft">
            Month <span className="font-mono tabular-nums text-ink">{prepayment.month}</span>
          </span>
          <span className="font-mono tabular-nums text-signal-green">
            {formatCurrency(prepayment.amount)}
          </span>
          <button
            type="button"
            onClick={() => onRemove(prepayment.id)}
            aria-label={`Remove prepayment of ${formatCurrency(prepayment.amount)} in month ${prepayment.month}`}
            className="rounded-sm px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-signal-red-wash hover:text-signal-red"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
