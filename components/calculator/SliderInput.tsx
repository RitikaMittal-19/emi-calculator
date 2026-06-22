"use client";

import { useEffect, useId, useState, type ChangeEvent } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Optional unit label shown next to the numeric field (e.g. "%", "months"). */
  unit?: string;
  /** Optional formatter for displaying the value (e.g. currency grouping). Defaults to plain toString. */
  formatValue?: (value: number) => string;
}

/** Slider drag events are debounced before triggering onChange — see the sliderDraft/debouncedSliderDraft state below for the full rationale. */
const SLIDER_DEBOUNCE_MS = 120;

/**
 * A paired numeric input + range slider, the foundational primitive behind
 * every loan input (amount/rate/tenure). The two controls stay in sync:
 * typing in the number field moves the slider and vice versa. Both fire
 * the same onChange, so callers don't need to know which control the user
 * touched.
 *
 * PERFORMANCE: native <input type="range"> fires a change/input event on
 * EVERY pixel of drag movement, not just on release. Since onChange here
 * ultimately triggers a dispatch — and once cross-tab sync is enabled,
 * dispatch broadcasts over BroadcastChannel — calling onChange directly
 * from the slider would flood every other open tab with a message per
 * pixel dragged. To avoid this, the slider tracks its OWN local visual
 * state (sliderDraft) for instant feedback during drag, while the actual
 * onChange call is debounced via useDebouncedValue: the slider looks and
 * feels perfectly responsive locally, but only one dispatch/broadcast
 * fires after the user pauses (or releases), not one per pixel.
 *
 * Accessibility: the visible <label> covers both controls via
 * aria-labelledby, the slider exposes aria-valuetext with the formatted
 * value (so screen readers announce "₹25,00,000" rather than a bare "25"),
 * and both controls are independently focusable and keyboard-operable
 * (native <input type="range"> already supports arrow keys out of the box).
 */
export function SliderInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
  formatValue,
}: SliderInputProps) {
  const labelId = useId();
  const numberInputId = useId();

  // Local draft state lets the number field hold an intermediate, possibly
  // invalid string (e.g. "" while the user is clearing it to retype)
  // without forcing onChange to fire on every keystroke with garbage data.
  const [draft, setDraft] = useState(String(value));
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  // Local visual state for the slider thumb during drag — see the
  // PERFORMANCE doc comment above. Resynced from `value` whenever it
  // changes from OUTSIDE this component (e.g. a remote tab's change
  // arriving via sync, or the number field committing a typed value) by
  // adjusting state DURING RENDER rather than in a useEffect — the
  // React-recommended pattern for "derived state that resets on prop
  // change" (same pattern already used in AmortizationTable's page-reset
  // logic), which avoids the extra render-then-effect cascade a
  // useEffect-based sync would cause.
  const [sliderDraft, setSliderDraft] = useState(value);
  const [lastSyncedValue, setLastSyncedValue] = useState(value);
  if (value !== lastSyncedValue) {
    setLastSyncedValue(value);
    setSliderDraft(value);
  }

  const debouncedSliderDraft = useDebouncedValue(sliderDraft, SLIDER_DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedSliderDraft !== value) {
      onChange(debouncedSliderDraft);
    }
    // onChange intentionally excluded: call sites pass a fresh inline
    // closure each render, which would otherwise re-trigger this effect
    // on every parent render rather than only when the debounced value
    // actually settles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSliderDraft]);

  const displayValue = formatValue ? formatValue(value) : String(value);

  function commitDraft(rawValue: string) {
    const parsed = Number(rawValue);
    if (rawValue.trim() !== "" && Number.isFinite(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(clamped);
    }
    setIsEditingDraft(false);
  }

  function handleNumberChange(event: ChangeEvent<HTMLInputElement>) {
    setDraft(event.target.value);
    setIsEditingDraft(true);
  }

  function handleSliderChange(event: ChangeEvent<HTMLInputElement>) {
    const next = Number(event.target.value);
    setSliderDraft(next);
    setDraft(String(next));
    setIsEditingDraft(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label id={labelId} htmlFor={numberInputId} className="text-sm font-medium text-ink-soft">
          {label}
        </label>
        <div className="flex shrink-0 items-baseline gap-1.5">
          <input
            id={numberInputId}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={isEditingDraft ? draft : value}
            onChange={handleNumberChange}
            onBlur={(e) => commitDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitDraft((e.target as HTMLInputElement).value);
            }}
            className="w-24 rounded-sm border border-rule bg-paper-raised px-2 py-1 text-right font-mono text-sm tabular-nums text-ink focus-visible:border-gold sm:w-28"
            aria-labelledby={labelId}
          />
          {unit ? <span className="text-xs text-ink-soft sm:text-sm">{unit}</span> : null}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderDraft}
        onChange={handleSliderChange}
        aria-labelledby={labelId}
        aria-valuetext={displayValue}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-rule accent-gold"
      />

      <div className="flex justify-between text-xs text-ink-soft/70">
        <span>{formatValue ? formatValue(min) : min}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
}
