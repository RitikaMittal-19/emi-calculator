"use client";

import { ModeTabs, tabPanelId } from "@/components/ModeTabs";
import { CalculatorView } from "@/components/calculator/CalculatorView";
import { ComparisonPanel } from "@/components/comparison/ComparisonPanel";
import { SensitivityGrid } from "@/components/sensitivity/SensitivityGrid";
import { ActiveTabsBadge } from "@/components/presence/ActiveTabsBadge";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useCalculatorState } from "@/hooks/useCalculatorState";

export default function Home() {
  const { state, setActiveMode } = useCalculatorState();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-2xl text-ink">EMI Calculator</h1>
          <p className="text-sm text-ink-soft">
            A shared workspace — changes here sync instantly across every open tab.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ActiveTabsBadge />
          <ThemeToggle />
        </div>
      </header>

      <ModeTabs activeMode={state.activeMode} onChange={setActiveMode} />

      <div id={tabPanelId("calculator")} role="tabpanel" aria-labelledby="mode-tab-calculator" hidden={state.activeMode !== "calculator"}>
        {state.activeMode === "calculator" ? <CalculatorView /> : null}
      </div>
      <div id={tabPanelId("comparison")} role="tabpanel" aria-labelledby="mode-tab-comparison" hidden={state.activeMode !== "comparison"}>
        {state.activeMode === "comparison" ? <ComparisonPanel /> : null}
      </div>
      <div id={tabPanelId("sensitivity")} role="tabpanel" aria-labelledby="mode-tab-sensitivity" hidden={state.activeMode !== "sensitivity"}>
        {state.activeMode === "sensitivity" ? <SensitivityGrid /> : null}
      </div>
    </main>
  );
}
