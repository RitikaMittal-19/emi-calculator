"use client";

import { SliderInput } from "./SliderInput";
import { ShareButton } from "./ShareButton";
import { useCalculatorState } from "@/hooks/useCalculatorState";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const PRINCIPAL_MIN = 100_000;
const PRINCIPAL_MAX = 20_000_000;
const PRINCIPAL_STEP = 50_000;

const RATE_MIN = 1;
const RATE_MAX = 20;
const RATE_STEP = 0.05;

const TENURE_MIN = 6;
const TENURE_MAX = 360;
const TENURE_STEP = 1;

/**
 * The primary loan input panel: amount, rate, and tenure, each as a paired
 * slider + numeric field. Every change dispatches through
 * useCalculatorState.setLoanInput, which (once Phase 8 lands) is also the
 * exact seam that broadcasts the change to other tabs — no separate
 * "sync" code path needed here.
 */
export function LoanInputForm() {
  const { state, setLoanInput } = useCalculatorState();
  const { primaryLoan } = state;

  return (
    <section
      aria-labelledby="loan-input-heading"
      className="flex flex-col gap-6 rounded-md border border-rule bg-paper-raised p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="loan-input-heading" className="font-serif text-lg text-ink">
          Loan details
        </h2>
        <ShareButton />
      </div>

      <SliderInput
        label="Loan amount"
        value={primaryLoan.principal}
        min={PRINCIPAL_MIN}
        max={PRINCIPAL_MAX}
        step={PRINCIPAL_STEP}
        onChange={(principal) => setLoanInput({ principal })}
        formatValue={formatCurrency}
      />

      <SliderInput
        label="Interest rate"
        value={primaryLoan.annualRate}
        min={RATE_MIN}
        max={RATE_MAX}
        step={RATE_STEP}
        onChange={(annualRate) => setLoanInput({ annualRate })}
        unit="% p.a."
        formatValue={(v) => `${v}%`}
      />

      <SliderInput
        label="Tenure"
        value={primaryLoan.tenureMonths}
        min={TENURE_MIN}
        max={TENURE_MAX}
        step={TENURE_STEP}
        onChange={(tenureMonths) => setLoanInput({ tenureMonths })}
        unit="months"
        formatValue={(v) => `${v} mo`}
      />
    </section>
  );
}
