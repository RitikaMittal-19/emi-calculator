import { LoanInputForm } from "@/components/calculator/LoanInputForm";
import { EmiSummaryCard } from "@/components/calculator/EmiSummaryCard";
import { PrincipalInterestChart } from "@/components/calculator/PrincipalInterestChart";
import { AmortizationSection } from "@/components/amortization/AmortizationSection";
import { PrepaymentPlanner } from "@/components/prepayment/PrepaymentPlanner";

/**
 * The full Calculator-mode view: loan inputs, EMI summary, breakdown
 * chart, prepayment planner, and amortization schedule. Extracted from
 * page.tsx so it can be rendered conditionally alongside Comparison and
 * Sensitivity modes based on activeMode.
 */
export function CalculatorView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LoanInputForm />
        <div className="flex flex-col gap-6">
          <EmiSummaryCard />
          <PrincipalInterestChart />
        </div>
      </div>

      <PrepaymentPlanner />
      <AmortizationSection />
    </div>
  );
}
