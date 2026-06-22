import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppStateProvider } from "@/lib/state/context";
import { ActiveTabsBadge } from "@/components/presence/ActiveTabsBadge";

describe("ActiveTabsBadge", () => {
  it("shows '1 tab' for a single tab (singular, sync disabled so presence stays at the seeded count of 1)", () => {
    render(
      <AppStateProvider tabId="tab-a" enableSync={false}>
        <ActiveTabsBadge />
      </AppStateProvider>,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("tab")).toBeInTheDocument();
  });

  it("uses role=status for assistive tech announcement", () => {
    render(
      <AppStateProvider tabId="tab-a" enableSync={false}>
        <ActiveTabsBadge />
      </AppStateProvider>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has an aria-label describing the live sync behavior", () => {
    render(
      <AppStateProvider tabId="tab-a" enableSync={false}>
        <ActiveTabsBadge />
      </AppStateProvider>,
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/synced live across tabs/i),
    );
  });

  it("shows '2 tabs' (plural) once a second real tab joins via sync, and reverts to '1 tab' when it leaves", async () => {
    const tabA = render(
      <AppStateProvider tabId="tab-a" enableSync>
        <ActiveTabsBadge />
      </AppStateProvider>,
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("tab")).toBeInTheDocument();

    const tabB = render(
      <AppStateProvider tabId="tab-b" enableSync>
        <div />
      </AppStateProvider>,
    );

    await vi.waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("tabs")).toBeInTheDocument();
    });

    tabB.unmount();

    await vi.waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("tab")).toBeInTheDocument();
    });

    tabA.unmount();
  });
});
