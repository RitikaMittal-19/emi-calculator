import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppStateProvider } from "@/lib/state/context";
import { SensitivityGrid } from "@/components/sensitivity/SensitivityGrid";
import { calculateEmi } from "@/lib/calculations/emi";
import { formatCurrency } from "@/lib/utils/formatCurrency";

function renderWithState(ui: ReactNode) {
  // enableSync={false}: these tests exercise UI/calculation logic only and
  // should stay isolated from real BroadcastChannel instances, which (a)
  // are unnecessary here and (b) would otherwise share a single OS-level
  // channel namespace across every test in this process, risking
  // cross-test interference. Cross-tab sync itself is covered by
  // dedicated tests in __tests__/lib/sync/.
  return render(<AppStateProvider tabId="test-tab" enableSync={false}>{ui}</AppStateProvider>);
}

describe("SensitivityGrid", () => {
  it("renders a 7x7 grid of data cells (49 + 1 header row + 1 header column)", () => {
    renderWithState(<SensitivityGrid />);

    const rows = screen.getAllByRole("row");
    // 1 header row + 7 data rows = 8 total rows.
    expect(rows).toHaveLength(8);

    // Each data row: 1 row header (<th scope="row">) + 7 data cells (<td>).
    const dataRows = rows.slice(1);
    for (const row of dataRows) {
      const cells = within(row).getAllByRole("cell");
      expect(cells).toHaveLength(7);
    }
  });

  it("displays 'Current' for both the rate and tenure header at delta 0", () => {
    renderWithState(<SensitivityGrid />);
    const currentLabels = screen.getAllByText("Current");
    // One for the rate-axis header, one for the tenure-axis header.
    expect(currentLabels).toHaveLength(2);
  });

  it("formats positive and negative deltas with explicit signs", () => {
    renderWithState(<SensitivityGrid />);
    expect(screen.getByText("+1%")).toBeInTheDocument();
    expect(screen.getByText("-1%")).toBeInTheDocument();
    expect(screen.getByText("+12mo")).toBeInTheDocument();
    expect(screen.getByText("-12mo")).toBeInTheDocument();
  });

  it("the current-selection cell's EMI matches calculateEmi for the loan's actual current terms", () => {
    renderWithState(<SensitivityGrid />);

    // Default loan: 25,00,000 @ 8.5% / 240 months.
    const expectedEmi = calculateEmi(2_500_000, 8.5, 240);
    const expectedText = formatCurrency(expectedEmi);

    // The current-selection cell carries an aria-label noting "(current loan)".
    const currentCell = screen.getByLabelText(/current loan/i);
    expect(within(currentCell).getByText(expectedText)).toBeInTheDocument();
  });

  it("only one cell is marked as the current loan", () => {
    renderWithState(<SensitivityGrid />);
    const currentCells = screen.getAllByLabelText(/\(current loan\)/i);
    expect(currentCells).toHaveLength(1);
  });

  it("displays a higher EMI for a +3% rate cell than for the current-selection cell", () => {
    renderWithState(<SensitivityGrid />);

    const expectedCurrentEmi = calculateEmi(2_500_000, 8.5, 240);
    const expectedHigherEmi = calculateEmi(2_500_000, 11.5, 240); // +3% rate, same tenure

    expect(screen.getByText(formatCurrency(expectedCurrentEmi))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(expectedHigherEmi))).toBeInTheDocument();
  });

  it("renders successfully for the default seeded loan, exercising generateSensitivityMatrix's clamping logic end to end", () => {
    // The clamping behavior itself (rate >= 0, tenure >= 1) is already
    // unit-tested directly against generateSensitivityMatrix in Phase 1;
    // this confirms the UI layer renders successfully on top of it without
    // crashing, e.g. on a NaN or malformed cell.
    renderWithState(<SensitivityGrid />);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("includes a legend explaining the color coding", () => {
    renderWithState(<SensitivityGrid />);
    const legend = screen.getByRole("list");
    expect(within(legend).getByText(/current loan/i)).toBeInTheDocument();
    expect(within(legend).getByText(/cheaper emi/i)).toBeInTheDocument();
    expect(within(legend).getByText(/more expensive emi/i)).toBeInTheDocument();
  });

  it("has an accessible table caption summarizing the grid", () => {
    renderWithState(<SensitivityGrid />);
    expect(screen.getByText(/sensitivity grid/i)).toBeInTheDocument();
  });

  it("applies a green-tinted background to cells cheaper than the current selection, and red to more expensive ones", () => {
    renderWithState(<SensitivityGrid />);

    // -3% rate at current tenure is unambiguously cheaper than the current
    // selection (lower rate, same tenure -> strictly lower EMI).
    const cheaperCell = screen.getByLabelText(/rate -3%, tenure current/i);
    expect(cheaperCell.getAttribute("style")).toMatch(/rgba\(47, 93, 58/); // green

    // +3% rate at current tenure is unambiguously more expensive.
    const expensiveCell = screen.getByLabelText(/rate \+3%, tenure current/i);
    expect(expensiveCell.getAttribute("style")).toMatch(/rgba\(138, 51, 36/); // red
  });
});
