import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "@/app/error";

describe("ErrorBoundary (app/error.tsx)", () => {
  it("renders a recoverable error message", () => {
    render(<ErrorBoundary error={new Error("boom")} reset={vi.fn()} />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/your other open tabs are unaffected/i)).toBeInTheDocument();
  });

  it("calls reset when 'Try again' is clicked", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error("boom")} reset={reset} />);

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("provides a reload option as a fallback recovery path", () => {
    render(<ErrorBoundary error={new Error("boom")} reset={vi.fn()} />);
    expect(screen.getByRole("button", { name: /reload page/i })).toBeInTheDocument();
  });

  it("logs the error to the console for debugging", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const testError = new Error("specific test error message");
    render(<ErrorBoundary error={testError} reset={vi.fn()} />);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("error"),
      testError,
    );
    consoleSpy.mockRestore();
  });
});
