"use client";

import { useMemo } from "react";
import { generateAmortizationSchedule } from "@/lib/calculations/amortization";
import type { Prepayment } from "@/types/prepayment";
import type { AmortizationResult } from "@/types/amortization";

/**
 * Memoizes the amortization schedule for a given loan + prepayment set.
 * Recomputes only when the underlying numeric inputs or the prepayment
 * list actually change — important since this can be a 360-row
 * computation and the component tree re-renders for unrelated reasons
 * (e.g. presence heartbeats ticking) far more often than the loan itself
 * changes.
 */
export function useAmortizationSchedule(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  prepayments: Prepayment[],
): AmortizationResult {
  return useMemo(
    () => generateAmortizationSchedule(principal, annualRate, tenureMonths, prepayments),
    [principal, annualRate, tenureMonths, prepayments],
  );
}
