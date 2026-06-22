"use client";

import { useMemo } from "react";
import { ScenarioCard } from "./ScenarioCard";
import { ScenarioForm } from "./ScenarioForm";
import { useCalculatorState } from "@/hooks/useCalculatorState";
import { findCheapestScenario } from "@/lib/calculations/amortization";
import { MAX_COMPARISON_SCENARIOS } from "@/lib/state/reducer";

/**
 * Comparison Mode: up to MAX_COMPARISON_SCENARIOS loan scenarios side by
 * side, with the cheapest (by total amount payable) highlighted via
 * findCheapestScenario — the same function tested thoroughly in Phase 1.
 * The active scenario selection (activeComparisonId) persists across mode
 * switches per architecture §4, which is already handled by the reducer;
 * this component just reads and writes it.
 */
export function ComparisonPanel() {
  const {
    state,
    addComparisonScenario,
    removeComparisonScenario,
    updateComparisonScenario,
    setActiveComparisonId,
  } = useCalculatorState();
  const { comparisonScenarios, activeComparisonId, primaryLoan } = state;

  const cheapest = useMemo(
    () => findCheapestScenario(comparisonScenarios),
    [comparisonScenarios],
  );

  return (
    <section
      aria-labelledby="comparison-heading"
      className="flex flex-col gap-5 rounded-md border border-rule bg-paper-raised p-5"
    >
      <h2 id="comparison-heading" className="font-serif text-lg text-ink">
        Compare scenarios
      </h2>

      <ScenarioForm
        scenarioCount={comparisonScenarios.length}
        maxScenarios={MAX_COMPARISON_SCENARIOS}
        defaultTerms={{
          principal: primaryLoan.principal,
          annualRate: primaryLoan.annualRate,
          tenureMonths: primaryLoan.tenureMonths,
        }}
        onAdd={addComparisonScenario}
      />

      {comparisonScenarios.length === 0 ? (
        <p className="rounded-sm border border-dashed border-rule px-3 py-8 text-center text-sm text-ink-soft">
          Add a scenario to start comparing loan options side by side.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {comparisonScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              isCheapest={comparisonScenarios.length > 1 && cheapest?.id === scenario.id}
              isActive={activeComparisonId === scenario.id}
              onSelect={() => setActiveComparisonId(scenario.id)}
              onUpdate={(updates) => updateComparisonScenario(scenario.id, updates)}
              onRemove={() => removeComparisonScenario(scenario.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
