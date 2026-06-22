import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppStateProvider } from "@/lib/state/context";
import { ShareButton } from "@/components/calculator/ShareButton";

function renderWithState() {
  return render(
    <AppStateProvider tabId="test-tab" enableSync={false}>
      <ShareButton />
    </AppStateProvider>,
  );
}

/**
 * navigator.clipboard is only populated once @testing-library/user-event's
 * setup() has run (it lazily installs a clipboard stub) — spying on it
 * must happen AFTER userEvent.setup(), inside each test, rather than in a
 * shared beforeEach that would run too early and find clipboard undefined.
 */
function spyOnClipboardWriteText() {
  return vi.spyOn(navigator.clipboard, "writeText").mockImplementation(() => Promise.resolve());
}

describe("ShareButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a Share button", () => {
    renderWithState();
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });

  it("copies a URL encoding the current loan's terms to the clipboard", async () => {
    const user = userEvent.setup();
    const writeTextSpy = spyOnClipboardWriteText();
    renderWithState();

    await user.click(screen.getByRole("button", { name: /share/i }));

    expect(writeTextSpy).toHaveBeenCalledOnce();
    const copiedUrl = writeTextSpy.mock.calls[0][0];
    // Default loan: 25,00,000 @ 8.5% / 240 months.
    expect(copiedUrl).toContain("p=2500000");
    expect(copiedUrl).toContain("r=8.5");
    expect(copiedUrl).toContain("t=240");
  });

  it("shows 'Copied!' confirmation after a successful copy, then reverts", async () => {
    const user = userEvent.setup();
    spyOnClipboardWriteText();
    renderWithState();

    await user.click(screen.getByRole("button", { name: /share/i }));
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();

    // Real timers: avoids a known-tricky interaction between fake timers
    // and userEvent's internal async event simulation. waitFor polls with
    // real elapsed time, which is fine for a 2-second revert window in a
    // test.
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /^share$/i })).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("falls back to window.prompt if the clipboard API rejects", async () => {
    const user = userEvent.setup();
    const writeTextSpy = spyOnClipboardWriteText();
    writeTextSpy.mockRejectedValue(new Error("clipboard denied"));
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null);
    renderWithState();

    await user.click(screen.getByRole("button", { name: /share/i }));

    expect(promptSpy).toHaveBeenCalledOnce();
    const [, promptedUrl] = promptSpy.mock.calls[0];
    expect(promptedUrl).toContain("p=2500000");
  });
});
