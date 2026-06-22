import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppStateProvider, useAppStateContext } from "@/lib/state/context";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

function renderWithState() {
  return render(
    <AppStateProvider tabId="test-tab" enableSync={false}>
      <ThemeToggle />
    </AppStateProvider>,
  );
}

describe("ThemeToggle", () => {
  it("starts labeled 'Light' with aria-pressed false, matching the default theme", () => {
    renderWithState();
    const button = screen.getByRole("button", { name: /switch to dark theme/i });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Light")).toBeInTheDocument();
  });

  it("toggles to 'Dark' with aria-pressed true after one click", async () => {
    const user = userEvent.setup();
    renderWithState();

    await user.click(screen.getByRole("button", { name: /switch to dark theme/i }));

    const button = screen.getByRole("button", { name: /switch to light theme/i });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Dark")).toBeInTheDocument();
  });

  it("toggles back to 'Light' after a second click", async () => {
    const user = userEvent.setup();
    renderWithState();

    await user.click(screen.getByRole("button", { name: /switch to dark theme/i }));
    await user.click(screen.getByRole("button", { name: /switch to light theme/i }));

    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /switch to dark theme/i }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("the accessible label always describes the action (what clicking WILL do), not the current state", async () => {
    // i.e. when theme is light, label says "Switch to dark" (the action);
    // it should never say "Switch to light" while already light.
    const user = userEvent.setup();
    renderWithState();

    expect(screen.queryByRole("button", { name: /switch to light theme/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button"));

    expect(screen.queryByRole("button", { name: /switch to dark theme/i })).not.toBeInTheDocument();
  });

  it("clicking the real toggle button propagates the theme change to a second, independent tab over the real sync pipeline", async () => {
    // This closes a gap left by Phase 8's sync tests, which only verified
    // theme propagation via a PROGRAMMATIC dispatch call — never through
    // an actual user click on the real ThemeToggle component. This test
    // exercises the full, real path: button click -> toggleTheme() ->
    // dispatch -> useBroadcastSync -> real BroadcastChannel -> second
    // tab's reducer -> second tab's re-render.
    const user = userEvent.setup();

    function TabAProbe() {
      return <ThemeToggle />;
    }
    function TabBProbe() {
      const { state } = useAppStateContext();
      return <span data-testid="tab-b-theme">{state.theme}</span>;
    }

    render(
      <AppStateProvider tabId="tab-a" enableSync>
        <TabAProbe />
      </AppStateProvider>,
    );
    render(
      <AppStateProvider tabId="tab-b" enableSync>
        <TabBProbe />
      </AppStateProvider>,
    );

    expect(screen.getByTestId("tab-b-theme")).toHaveTextContent("light");

    await user.click(screen.getByRole("button", { name: /switch to dark theme/i }));

    await vi.waitFor(() => {
      expect(screen.getByTestId("tab-b-theme")).toHaveTextContent("dark");
    });
  });
});
