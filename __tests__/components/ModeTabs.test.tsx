import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeTabs } from "@/components/ModeTabs";

describe("ModeTabs", () => {
  it("renders all three modes as tabs", () => {
    render(<ModeTabs activeMode="calculator" onChange={vi.fn()} />);
    expect(screen.getByRole("tab", { name: /calculator/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /compare/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /sensitivity/i })).toBeInTheDocument();
  });

  it("marks the active mode's tab as aria-selected", () => {
    render(<ModeTabs activeMode="comparison" onChange={vi.fn()} />);
    expect(screen.getByRole("tab", { name: /compare/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /calculator/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("calls onChange with the clicked mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModeTabs activeMode="calculator" onChange={onChange} />);

    await user.click(screen.getByRole("tab", { name: /sensitivity/i }));

    expect(onChange).toHaveBeenCalledWith("sensitivity");
  });

  it("uses tablist role for the container", () => {
    render(<ModeTabs activeMode="calculator" onChange={vi.fn()} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("only the active tab is in the normal Tab order (roving tabindex)", () => {
    render(<ModeTabs activeMode="comparison" onChange={vi.fn()} />);
    expect(screen.getByRole("tab", { name: /compare/i })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: /calculator/i })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tab", { name: /sensitivity/i })).toHaveAttribute("tabindex", "-1");
  });

  it("ArrowRight moves focus and selection to the next tab, wrapping around at the end", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModeTabs activeMode="sensitivity" onChange={onChange} />);

    screen.getByRole("tab", { name: /sensitivity/i }).focus();
    await user.keyboard("{ArrowRight}");

    // Sensitivity is the last tab; ArrowRight should wrap to the first (Calculator).
    expect(onChange).toHaveBeenCalledWith("calculator");
  });

  it("ArrowLeft moves focus and selection to the previous tab, wrapping around at the start", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModeTabs activeMode="calculator" onChange={onChange} />);

    screen.getByRole("tab", { name: /calculator/i }).focus();
    await user.keyboard("{ArrowLeft}");

    // Calculator is the first tab; ArrowLeft should wrap to the last (Sensitivity).
    expect(onChange).toHaveBeenCalledWith("sensitivity");
  });

  it("moves DOM focus onto the newly-selected tab after an arrow key (not just selecting it logically)", async () => {
    const user = userEvent.setup();
    // onChange is a no-op here on purpose: this test renders with a fixed
    // activeMode and only checks that focus moves, independent of whether
    // a real parent component would also re-render with a new activeMode.
    render(<ModeTabs activeMode="calculator" onChange={vi.fn()} />);

    const calculatorTab = screen.getByRole("tab", { name: /calculator/i });
    calculatorTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: /compare/i })).toHaveFocus();
  });

  it("each tab has aria-controls pointing to its corresponding tabpanel id", () => {
    render(<ModeTabs activeMode="calculator" onChange={vi.fn()} />);
    expect(screen.getByRole("tab", { name: /calculator/i })).toHaveAttribute(
      "aria-controls",
      "mode-panel-calculator",
    );
    expect(screen.getByRole("tab", { name: /compare/i })).toHaveAttribute(
      "aria-controls",
      "mode-panel-comparison",
    );
    expect(screen.getByRole("tab", { name: /sensitivity/i })).toHaveAttribute(
      "aria-controls",
      "mode-panel-sensitivity",
    );
  });
});
