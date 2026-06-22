import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppStateProvider } from "@/lib/state/context";
import { ThemeClassSync } from "@/app/providers";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

describe("ThemeClassSync", () => {
  afterEach(() => {
    // ThemeClassSync mutates the real shared document.documentElement —
    // reset it after every test so one test's theme state can't leak into
    // the next test's assertions.
    document.documentElement.classList.remove("dark");
  });

  it("does not add the dark class when theme is light (the default)", () => {
    render(
      <AppStateProvider tabId="test-tab" enableSync={false}>
        <ThemeClassSync />
      </AppStateProvider>,
    );
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("adds the dark class to <html> when the theme toggles to dark", async () => {
    const user = userEvent.setup();
    render(
      <AppStateProvider tabId="test-tab" enableSync={false}>
        <ThemeClassSync />
        <ThemeToggle />
      </AppStateProvider>,
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await user.click(screen.getByRole("button", { name: /switch to dark theme/i }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes the dark class when toggled back to light", async () => {
    const user = userEvent.setup();
    render(
      <AppStateProvider tabId="test-tab" enableSync={false}>
        <ThemeClassSync />
        <ThemeToggle />
      </AppStateProvider>,
    );

    await user.click(screen.getByRole("button", { name: /switch to dark theme/i }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await user.click(screen.getByRole("button", { name: /switch to light theme/i }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
