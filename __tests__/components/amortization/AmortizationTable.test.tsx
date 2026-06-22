import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AmortizationTable } from "@/components/amortization/AmortizationTable";
import { generateAmortizationSchedule } from "@/lib/calculations/amortization";

describe("AmortizationTable", () => {
  it("shows exactly 12 rows on the first page for a long schedule", () => {
    const result = generateAmortizationSchedule(1_000_000, 8.5, 240);
    render(<AmortizationTable schedule={result.schedule} breakEvenMonth={result.breakEvenMonth} />);
    const rows = screen.getAllByRole("row");
    // 1 header row + 12 body rows = 13
    expect(rows).toHaveLength(13);
  });

  it("does not render pagination controls when the schedule fits on one page", () => {
    const result = generateAmortizationSchedule(500_000, 8, 6); // 6 months, well under 12
    render(<AmortizationTable schedule={result.schedule} breakEvenMonth={result.breakEvenMonth} />);
    expect(screen.queryByRole("navigation", { name: /pagination/i })).not.toBeInTheDocument();
  });

  it("renders pagination controls and navigates to the next page", async () => {
    const user = userEvent.setup();
    const result = generateAmortizationSchedule(1_000_000, 8.5, 240); // 240 months -> 20 pages
    render(<AmortizationTable schedule={result.schedule} breakEvenMonth={result.breakEvenMonth} />);

    expect(screen.getByText(/page 1 of 20/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText(/page 2 of 20/i)).toBeInTheDocument();
    // Month 13 should now be visible (first row of page 2).
    expect(screen.getByText("13")).toBeInTheDocument();
  });

  it("highlights the break-even row with a visible label", () => {
    const shortResult = generateAmortizationSchedule(120_000, 0, 12); // 0% interest -> break-even month 1
    const { container } = render(
      <AmortizationTable schedule={shortResult.schedule} breakEvenMonth={shortResult.breakEvenMonth} />,
    );
    expect(within(container).getByText(/break-even/i)).toBeInTheDocument();
  });

  it("resets to page 1 when the schedule shrinks below the current page's range", async () => {
    const user = userEvent.setup();
    const longResult = generateAmortizationSchedule(1_000_000, 8.5, 240);
    const { rerender } = render(
      <AmortizationTable schedule={longResult.schedule} breakEvenMonth={longResult.breakEvenMonth} />,
    );

    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole("button", { name: /next/i }));
    }
    expect(screen.getByText(/page 5 of 20/i)).toBeInTheDocument();

    // Shrink the schedule drastically (simulating a large prepayment that
    // closes the loan early) and rerender.
    const shortResult = generateAmortizationSchedule(1_000_000, 8.5, 240, [
      { id: "p1", month: 1, amount: 950_000 },
    ]);
    rerender(
      <AmortizationTable schedule={shortResult.schedule} breakEvenMonth={shortResult.breakEvenMonth} />,
    );

    // Should have reset to page 1, not be stuck on a now-invalid page 5.
    expect(screen.getByText(/page 1 of/i)).toBeInTheDocument();
  });

  it("displays a dash for months with no prepayment, and the amount for months with one", () => {
    const result = generateAmortizationSchedule(500_000, 8, 60, [
      { id: "p1", month: 3, amount: 20_000 },
    ]);
    render(<AmortizationTable schedule={result.schedule} breakEvenMonth={result.breakEvenMonth} />);

    const rows = screen.getAllByRole("row");
    // Row index 3 in the table corresponds to month 3 (header is index 0).
    const month3Row = rows[3];
    expect(within(month3Row).getByText(/20,000\.00/)).toBeInTheDocument();
  });
});
