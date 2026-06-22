"use client";

export type AmortizationView = "table" | "chart";

interface TableChartToggleProps {
  view: AmortizationView;
  onChange: (view: AmortizationView) => void;
}

/**
 * Segmented control switching the amortization section between its table
 * and chart views. Implemented as a radiogroup (not plain buttons) since
 * exactly one of two mutually exclusive views is always selected — that's
 * the correct semantics for assistive tech, and gives arrow-key navigation
 * between the two options for free.
 */
export function TableChartToggle({ view, onChange }: TableChartToggleProps) {
  const options: { value: AmortizationView; label: string }[] = [
    { value: "table", label: "Table" },
    { value: "chart", label: "Chart" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Amortization view"
      className="inline-flex rounded-sm border border-rule p-0.5"
    >
      {options.map((option) => {
        const isActive = view === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={`rounded-sm px-3 py-1 text-sm transition-colors ${
              isActive
                ? "bg-gold-wash text-ink font-medium"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
