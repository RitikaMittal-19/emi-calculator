"use client";

import type { LoanInput } from "@/types/loan";

interface ScenarioFormProps {
  scenarioCount: number;
  maxScenarios: number;
  /** Used to seed sensible defaults for a new scenario (the primary loan's current terms), rather than starting from blank/zero fields. */
  defaultTerms: Pick<LoanInput, "principal" | "annualRate" | "tenureMonths">;
  onAdd: (scenario: LoanInput) => void;
}

/**
 * Adds a new comparison scenario, seeded from the primary loan's current
 * terms (so the user immediately has something sensible to tweak rather
 * than starting from zero) with an auto-incrementing label ("Scenario A",
 * "Scenario B", "Scenario C"). The button disables at the 3-scenario cap —
 * the reducer already rejects a 4th scenario defensively (see Phase 2),
 * but the UI should make the limit visible rather than silently no-op.
 */
export function ScenarioForm({
  scenarioCount,
  maxScenarios,
  defaultTerms,
  onAdd,
}: ScenarioFormProps) {
  const atCapacity = scenarioCount >= maxScenarios;
  const nextLabel = String.fromCharCode("A".charCodeAt(0) + scenarioCount);

  function handleAdd() {
    if (atCapacity) return;
    onAdd({
      id: crypto.randomUUID(),
      label: `Scenario ${nextLabel}`,
      ...defaultTerms,
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-ink-soft">
        {atCapacity
          ? `Maximum of ${maxScenarios} scenarios reached. Remove one to add another.`
          : `Compare up to ${maxScenarios} loan scenarios side by side.`}
      </p>
      <button
        type="button"
        onClick={handleAdd}
        disabled={atCapacity}
        className="shrink-0 rounded-sm border border-rule px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-rule"
      >
        Add scenario
      </button>
    </div>
  );
}
