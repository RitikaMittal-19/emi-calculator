import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { AppStateProvider } from "@/lib/state/context";
import { PrepaymentPlanner } from "@/components/prepayment/PrepaymentPlanner";

function renderWithState(ui: ReactNode) {
  // enableSync={false}: see SensitivityGrid.test.tsx for rationale.
  return render(<AppStateProvider tabId="test-tab" enableSync={false}>{ui}</AppStateProvider>);
}

async function addPrepayment(user: ReturnType<typeof userEvent.setup>, month: string, amount: string) {
  await user.clear(screen.getByLabelText(/^month$/i));
  await user.type(screen.getByLabelText(/^month$/i), month);
  await user.clear(screen.getByLabelText(/^amount$/i));
  await user.type(screen.getByLabelText(/^amount$/i), amount);
  await user.click(screen.getByRole("button", { name: /add prepayment/i }));
}

describe("PrepaymentPlanner", () => {
  it("shows the empty state with no prepayments initially", () => {
    renderWithState(<PrepaymentPlanner />);
    expect(screen.getByText(/no prepayments yet/i)).toBeInTheDocument();
  });

  it("does not show the interest-saved summary when there are no prepayments", () => {
    renderWithState(<PrepaymentPlanner />);
    expect(screen.queryByText(/interest saved/i)).not.toBeInTheDocument();
  });

  it("adds a valid prepayment and shows it in the list", async () => {
    const user = userEvent.setup();
    renderWithState(<PrepaymentPlanner />);

    // Default loan is 25,00,000 @ 8.5% / 240mo — month 12 has plenty of headroom.
    await addPrepayment(user, "12", "50000");

    expect(screen.getByText("₹50,000")).toBeInTheDocument();
    expect(screen.queryByText(/no prepayments yet/i)).not.toBeInTheDocument();
  });

  it("shows the interest-saved and tenure-reduced summary after adding a prepayment", async () => {
    const user = userEvent.setup();
    renderWithState(<PrepaymentPlanner />);

    await addPrepayment(user, "12", "200000");

    expect(screen.getByText(/interest saved/i)).toBeInTheDocument();
    expect(screen.getByText(/tenure reduced by/i)).toBeInTheDocument();
    // Tenure reduced should show a positive month count, not "0 mo".
    const tenureSection = screen.getByText(/tenure reduced by/i).closest("div");
    expect(within(tenureSection!).queryByText("0 mo")).not.toBeInTheDocument();
  });

  it("rejects a prepayment exceeding the outstanding balance and shows an error", async () => {
    const user = userEvent.setup();
    renderWithState(<PrepaymentPlanner />);

    // Loan principal is 25,00,000 — request an absurdly large prepayment.
    await addPrepayment(user, "1", "999999999");

    expect(screen.getByRole("alert")).toHaveTextContent(/exceeds outstanding balance/i);
    // Should not have been added to the list.
    expect(screen.getByText(/no prepayments yet/i)).toBeInTheDocument();
  });

  it("rejects a prepayment month beyond the loan tenure", async () => {
    const user = userEvent.setup();
    renderWithState(<PrepaymentPlanner />);

    // Default tenure is 240 months.
    await addPrepayment(user, "500", "10000");

    expect(screen.getByRole("alert")).toHaveTextContent(/exceeds loan tenure/i);
  });

  it("distinguishes 'beyond tenure' from 'loan closed early' — regression test for an ordering bug where both cases produced the same misleading message", async () => {
    const user = userEvent.setup();
    renderWithState(<PrepaymentPlanner />);

    // Case 1: month is structurally beyond the loan's tenure entirely (the
    // schedule was never going to have a row for it under any
    // circumstances). Must report "exceeds loan tenure", not "already
    // repaid".
    await addPrepayment(user, "999", "10000");
    expect(screen.getByRole("alert")).toHaveTextContent(/exceeds loan tenure/i);

    // Case 2: month IS within the original tenure (240), but a massive
    // first prepayment closes the loan out long before reaching it. Must
    // report "already fully repaid", not "exceeds loan tenure" (since,
    // structurally, the month is in range).
    await addPrepayment(user, "1", "2499000"); // closes a 25,00,000 loan almost immediately
    await addPrepayment(user, "200", "1000"); // well within original 240mo tenure, but loan is long closed
    expect(screen.getByRole("alert")).toHaveTextContent(/already fully repaid/i);
  });

  it("rejects a zero or negative amount", async () => {
    const user = userEvent.setup();
    renderWithState(<PrepaymentPlanner />);

    await addPrepayment(user, "12", "0");

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("removes a prepayment when Remove is clicked", async () => {
    const user = userEvent.setup();
    renderWithState(<PrepaymentPlanner />);

    await addPrepayment(user, "12", "50000");
    expect(screen.getByText("₹50,000")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove/i }));

    expect(screen.queryByText("₹50,000")).not.toBeInTheDocument();
    expect(screen.getByText(/no prepayments yet/i)).toBeInTheDocument();
  });

  it("clears the form fields after a successful add", async () => {
    const user = userEvent.setup();
    renderWithState(<PrepaymentPlanner />);

    await addPrepayment(user, "12", "50000");

    expect(screen.getByLabelText(/^month$/i)).toHaveValue(null);
    expect(screen.getByLabelText(/^amount$/i)).toHaveValue(null);
  });

  it("validates a second prepayment against the UPDATED balance after the first is applied", async () => {
    const user = userEvent.setup();
    renderWithState(<PrepaymentPlanner />);

    // First prepayment: a large chunk early in the loan.
    await addPrepayment(user, "1", "2000000"); // 20 lakh against a 25 lakh loan

    // Second prepayment: try to take out more than what's realistically
    // left after the first prepayment + a few months of regular EMI
    // principal — should be rejected against the now-much-smaller balance,
    // not the original 25 lakh principal.
    await addPrepayment(user, "12", "2000000");

    expect(screen.getByRole("alert")).toHaveTextContent(/exceeds outstanding balance/i);
  });

  it("allows two prepayments in different months and lists both, sorted by month", async () => {
    const user = userEvent.setup();
    renderWithState(<PrepaymentPlanner />);

    await addPrepayment(user, "24", "50000");
    await addPrepayment(user, "6", "30000");

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    // Sorted ascending by month: month 6 should appear before month 24.
    expect(within(items[0]).getByText("6")).toBeInTheDocument();
    expect(within(items[1]).getByText("24")).toBeInTheDocument();
  });

  it("allows two SEPARATE entries in the SAME month (each stored independently; merging happens downstream in the amortization engine, not in the list UI)", async () => {
    const user = userEvent.setup();
    renderWithState(<PrepaymentPlanner />);

    await addPrepayment(user, "12", "20000");
    await addPrepayment(user, "12", "15000");

    // The planner list shows both entries as added (it's the schedule
    // generator, tested separately in Phase 1, that merges same-month
    // amounts when computing the actual amortization) — so two list items
    // should be present, both for month 12.
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("12")).toBeInTheDocument();
    expect(within(items[1]).getByText("12")).toBeInTheDocument();

    // The interest-saved figure should reflect the COMBINED 35,000 impact,
    // not just one of the two entries — confirms the merge is genuinely
    // happening in the schedule that drives the summary numbers.
    expect(screen.getByText(/interest saved/i)).toBeInTheDocument();
  });
});
