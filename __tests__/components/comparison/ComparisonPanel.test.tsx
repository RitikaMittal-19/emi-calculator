import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { AppStateProvider } from "@/lib/state/context";
import { ComparisonPanel } from "@/components/comparison/ComparisonPanel";

function renderWithState(ui: ReactNode) {
  // enableSync={false}: see SensitivityGrid.test.tsx for rationale.
  return render(<AppStateProvider tabId="test-tab" enableSync={false}>{ui}</AppStateProvider>);
}

async function addScenario(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /add scenario/i }));
}

describe("ComparisonPanel", () => {
  it("shows an empty state with no scenarios initially", () => {
    renderWithState(<ComparisonPanel />);
    expect(screen.getByText(/add a scenario to start comparing/i)).toBeInTheDocument();
  });

  it("adds a scenario seeded from the primary loan's current terms", async () => {
    const user = userEvent.setup();
    renderWithState(<ComparisonPanel />);

    await addScenario(user);

    expect(screen.getByText("Scenario A")).toBeInTheDocument();
    expect(screen.queryByText(/add a scenario to start comparing/i)).not.toBeInTheDocument();
  });

  it("labels successive scenarios A, B, C", async () => {
    const user = userEvent.setup();
    renderWithState(<ComparisonPanel />);

    await addScenario(user);
    await addScenario(user);
    await addScenario(user);

    expect(screen.getByText("Scenario A")).toBeInTheDocument();
    expect(screen.getByText("Scenario B")).toBeInTheDocument();
    expect(screen.getByText("Scenario C")).toBeInTheDocument();
  });

  it("disables the Add button and shows a message once 3 scenarios are reached", async () => {
    const user = userEvent.setup();
    renderWithState(<ComparisonPanel />);

    await addScenario(user);
    await addScenario(user);
    await addScenario(user);

    expect(screen.getByRole("button", { name: /add scenario/i })).toBeDisabled();
    expect(screen.getByText(/maximum of 3 scenarios reached/i)).toBeInTheDocument();
  });

  it("removes a scenario when its Remove button is clicked", async () => {
    const user = userEvent.setup();
    renderWithState(<ComparisonPanel />);

    await addScenario(user);
    expect(screen.getByText("Scenario A")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove scenario a/i }));

    expect(screen.queryByText("Scenario A")).not.toBeInTheDocument();
    expect(screen.getByText(/add a scenario to start comparing/i)).toBeInTheDocument();
  });

  it("does NOT show a 'cheapest' badge when there is only one scenario", async () => {
    const user = userEvent.setup();
    renderWithState(<ComparisonPanel />);

    await addScenario(user);

    expect(screen.queryByText(/cheapest/i)).not.toBeInTheDocument();
  });

  it("highlights the cheapest scenario once a cheaper one is added", async () => {
    const user = userEvent.setup();
    renderWithState(<ComparisonPanel />);

    await addScenario(user); // Scenario A — seeded from primary loan (25,00,000 / 8.5% / 240mo)
    await addScenario(user); // Scenario B — same terms initially, tied

    // Edit Scenario B's amount field down significantly to make it cheaper.
    const scenarioBCard = screen.getByText("Scenario B").closest("article")!;
    const amountInput = within(scenarioBCard).getByLabelText(/amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, "500000");
    await user.tab(); // blur to commit, in case of any blur-based commit logic

    expect(within(scenarioBCard).getByText(/cheapest/i)).toBeInTheDocument();
    const scenarioACard = screen.getByText("Scenario A").closest("article")!;
    expect(within(scenarioACard).queryByText(/cheapest/i)).not.toBeInTheDocument();
  });

  it("sets a scenario as active when its select button is clicked, and reflects that visually (now keyboard-accessible, not just a div-wide click)", async () => {
    const user = userEvent.setup();
    renderWithState(<ComparisonPanel />);

    await addScenario(user);
    const card = screen.getByText("Scenario A").closest("article")!;
    const selectButton = within(card).getByRole("button", { name: "Scenario A" });

    await user.click(selectButton);

    // Active state is reflected via a border/background class change on
    // the card, and aria-pressed on the select button itself.
    expect(card.className).toContain("border-gold");
    expect(selectButton).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking the remove button does not also trigger card selection", async () => {
    const user = userEvent.setup();
    renderWithState(<ComparisonPanel />);

    await addScenario(user);
    await addScenario(user);

    const cardA = screen.getByText("Scenario A").closest("article")!;
    const cardB = screen.getByText("Scenario B").closest("article")!;

    // Select A first.
    await user.click(within(cardA).getByRole("button", { name: /^Scenario A/ }));
    expect(cardA.className).toContain("border-gold");

    // Removing B should not change A's active selection.
    await user.click(within(cardB).getByRole("button", { name: /remove/i }));
    expect(cardA.className).toContain("border-gold");
  });

  it("the select button is reachable and operable via keyboard alone (Tab + Enter), not just mouse click", async () => {
    const user = userEvent.setup();
    renderWithState(<ComparisonPanel />);

    await addScenario(user);
    const card = screen.getByText("Scenario A").closest("article")!;
    const selectButton = within(card).getByRole("button", { name: "Scenario A" });

    selectButton.focus();
    expect(selectButton).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(card.className).toContain("border-gold");
  });

  it("editing a scenario's inputs does not trigger card selection (inner click is stopped)", async () => {
    const user = userEvent.setup();
    renderWithState(<ComparisonPanel />);

    await addScenario(user);
    const card = screen.getByText("Scenario A").closest("article")!;
    const rateInput = within(card).getByLabelText(/rate/i);

    await user.clear(rateInput);
    await user.type(rateInput, "9");

    // Editing inputs should not have set this card as "active" via the
    // card-level onClick, since the inner group stops propagation.
    expect(card.className).not.toContain("border-gold");
  });

  it("allows typing a smaller number digit-by-digit without it snapping to min mid-typing — regression test for a clamp-on-every-keystroke bug", async () => {
    const user = userEvent.setup();
    renderWithState(<ComparisonPanel />);

    await addScenario(user);
    const card = screen.getByText("Scenario A").closest("article")!;
    const amountInput = within(card).getByLabelText(/amount/i) as HTMLInputElement;

    // Amount field min is 100,000 — typing "500000" digit by digit means
    // the first keystroke ("5") is well below min. If the field clamps on
    // every keystroke (the bug), it would jump straight to the min value
    // and the rest of the typed digits would compound on top of that
    // already-wrong value instead of the intended 500000.
    await user.clear(amountInput);
    await user.type(amountInput, "500000");

    expect(amountInput.value).toBe("500000");
  });

});
