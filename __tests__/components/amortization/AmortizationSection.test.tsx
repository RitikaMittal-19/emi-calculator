import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppStateProvider } from "@/lib/state/context";
import { AmortizationSection } from "@/components/amortization/AmortizationSection";

function renderWithState() {
  return render(
    <AppStateProvider tabId="test-tab" enableSync={false}>
      <AmortizationSection />
    </AppStateProvider>,
  );
}

describe("AmortizationSection — CSV export", () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn<(obj: Blob | MediaSource) => string>>;
  let clickSpy: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    createObjectURLSpy = vi.fn<(obj: Blob | MediaSource) => string>(() => "blob:mock-url");
    URL.createObjectURL = createObjectURLSpy;
    URL.revokeObjectURL = vi.fn();
    clickSpy = vi.fn<() => void>();
    HTMLAnchorElement.prototype.click = clickSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an Export CSV button", () => {
    renderWithState();
    expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();
  });

  it("clicking Export CSV triggers a download (creates a Blob URL and clicks an anchor)", async () => {
    const user = userEvent.setup();
    renderWithState();

    await user.click(screen.getByRole("button", { name: /export csv/i }));

    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it("the exported Blob's content reflects the current loan's actual schedule data, not placeholder data", async () => {
    const user = userEvent.setup();
    renderWithState();

    await user.click(screen.getByRole("button", { name: /export csv/i }));

    const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob;
    const text = await blobArg.text();

    // Default loan: 25,00,000 @ 8.5% / 240 months -> 240 data rows + header.
    const lines = text.trim().split("\r\n");
    expect(lines).toHaveLength(241);
    expect(lines[0]).toContain("Month");
    expect(lines[1]).toMatch(/^1,2500000,/); // month 1, opening balance = full principal
  });

  it("creates and removes a temporary anchor with the expected filename pattern", async () => {
    const user = userEvent.setup();
    const appendSpy = vi.spyOn(document.body, "appendChild");

    renderWithState();
    await user.click(screen.getByRole("button", { name: /export csv/i }));

    const anchorCall = appendSpy.mock.calls.find(
      ([node]) => node instanceof HTMLAnchorElement,
    );
    expect(anchorCall).toBeDefined();
    const anchor = anchorCall![0] as HTMLAnchorElement;
    expect(anchor.download).toMatch(/^amortization-2500000-8\.5pct-240mo\.csv$/);

    appendSpy.mockRestore();
  });
});
