"use client";

import { useId, useState } from "react";
import type { LoanInput } from "@/types/loan";
import { calculateEmiResult } from "@/lib/calculations/emi";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface ScenarioCardProps {
  scenario: LoanInput;
  isCheapest: boolean;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Omit<LoanInput, "id">>) => void;
  onRemove: () => void;
}

const PRINCIPAL_MIN = 100_000;
const PRINCIPAL_MAX = 20_000_000;
const PRINCIPAL_STEP = 50_000;
const RATE_MIN = 1;
const RATE_MAX = 20;
const RATE_STEP = 0.05;
const TENURE_MIN = 6;
const TENURE_MAX = 360;

/**
 * A single comparison scenario, editable inline via compact number inputs
 * (deliberately NOT the full SliderInput from Calculator mode — three
 * scenarios side by side with full sliders would be visually noisy; compact
 * fields keep the focus on comparing results, not fiddling with inputs).
 *
 * The cheapest scenario (by total amount payable, per findCheapestScenario)
 * gets the gold accent treatment — same visual language as "principal" in
 * Calculator mode, since both represent "the favorable outcome."
 *
 * Clicking the card body (outside the inputs/remove button) sets this
 * scenario as the active one, persisted via activeComparisonId so it's
 * retained across mode switches per architecture §4.
 */
export function ScenarioCard({
  scenario,
  isCheapest,
  isActive,
  onSelect,
  onUpdate,
  onRemove,
}: ScenarioCardProps) {
  const headingId = useId();
  const result = calculateEmiResult(
    scenario.principal,
    scenario.annualRate,
    scenario.tenureMonths,
  );

  return (
    <article
      aria-labelledby={headingId}
      className={`flex flex-col gap-4 rounded-md border p-4 transition-colors ${
        isActive
          ? "border-gold bg-gold-wash"
          : "border-rule bg-paper-raised hover:border-rule-strong"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={isActive}
          className="flex items-center gap-2 rounded-sm text-left focus-visible:outline-offset-4"
        >
          <h3 id={headingId} className="font-serif text-base text-ink">
            {scenario.label ?? "Scenario"}
          </h3>
          {isCheapest ? (
            <span className="rounded-sm bg-gold-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-paper-raised">
              Cheapest
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${scenario.label ?? "scenario"}`}
          className="rounded-sm px-1.5 py-0.5 text-xs text-ink-soft transition-colors hover:bg-signal-red-wash hover:text-signal-red"
        >
          Remove
        </button>
      </div>

      <div
        className="flex flex-col gap-3"
        role="group"
        aria-label={`Edit ${scenario.label ?? "scenario"} terms`}
      >
        <CompactField
          label="Amount"
          value={scenario.principal}
          min={PRINCIPAL_MIN}
          max={PRINCIPAL_MAX}
          step={PRINCIPAL_STEP}
          onChange={(principal) => onUpdate({ principal })}
        />
        <CompactField
          label="Rate %"
          value={scenario.annualRate}
          min={RATE_MIN}
          max={RATE_MAX}
          step={RATE_STEP}
          onChange={(annualRate) => onUpdate({ annualRate })}
        />
        <CompactField
          label="Tenure (mo)"
          value={scenario.tenureMonths}
          min={TENURE_MIN}
          max={TENURE_MAX}
          step={1}
          onChange={(tenureMonths) => onUpdate({ tenureMonths })}
        />
      </div>

      <dl className="flex flex-col gap-2 border-t border-rule pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-soft">EMI</dt>
          <dd className="font-mono tabular-nums text-ink">{formatCurrency(result.emi)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">Total payable</dt>
          <dd
            className={`font-mono tabular-nums ${isCheapest ? "text-gold" : "text-ink"}`}
          >
            {formatCurrency(result.totalPayable)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

interface CompactFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function CompactField({ label, value, min, max, step, onChange }: CompactFieldProps) {
  const id = useId();

  // Local draft state lets the field hold an intermediate, possibly
  // out-of-range string while the user is mid-typing (e.g. typing "5" as
  // the first digit of "500000" must not get clamped up to `min`
  // immediately) — only commits (and clamps) on blur or Enter, matching
  // the pattern already used by SliderInput.
  const [draft, setDraft] = useState(String(value));
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  function commitDraft(rawValue: string) {
    const parsed = Number(rawValue);
    if (rawValue.trim() !== "" && Number.isFinite(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
    setIsEditingDraft(false);
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-xs text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={isEditingDraft ? draft : value}
        onChange={(e) => {
          setDraft(e.target.value);
          setIsEditingDraft(true);
        }}
        onBlur={(e) => commitDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitDraft((e.target as HTMLInputElement).value);
        }}
        className="w-24 rounded-sm border border-rule bg-paper px-2 py-1 text-right font-mono text-sm tabular-nums text-ink focus-visible:border-gold sm:w-28"
      />
    </div>
  );
}
