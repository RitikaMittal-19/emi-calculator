import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SliderInput } from "@/components/calculator/SliderInput";

describe("SliderInput", () => {
  it("renders the current value in the number field", () => {
    render(
      <SliderInput label="Loan amount" value={500_000} min={100_000} max={1_000_000} step={1000} onChange={vi.fn()} />,
    );
    expect(
      screen.getByLabelText("Loan amount", { selector: "input[type='number']" }),
    ).toHaveValue(500_000);
  });

  it("calls onChange once, with the final value, after rapid sequential slider changes settle (debounced, not one call per change)", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(
      <SliderInput label="Loan amount" value={500_000} min={100_000} max={1_000_000} step={1000} onChange={onChange} />,
    );

    const slider = screen.getByLabelText("Loan amount", { selector: 'input[type="range"]' });

    // Simulate rapid drag: many change events fire in quick succession,
    // exactly like dragging a native range input does (one event per
    // pixel of movement), well within the 120ms debounce window of each
    // other.
    fireEvent.change(slider, { target: { value: "510000" } });
    fireEvent.change(slider, { target: { value: "520000" } });
    fireEvent.change(slider, { target: { value: "530000" } });
    fireEvent.change(slider, { target: { value: "540000" } });
    fireEvent.change(slider, { target: { value: "550000" } });

    // Before the debounce window elapses, onChange must NOT have fired at
    // all yet — this is the core behavior being guarded: a real drag
    // produces dozens of these events, and none of them should reach
    // onChange (and thus dispatch/broadcast) individually.
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(120);
    });

    // Exactly ONE call, with the FINAL settled value — not 5 calls, one
    // per intermediate change.
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(550000);

    vi.useRealTimers();
  });

  it("the slider visually reflects each intermediate value immediately, even though onChange is debounced (instant local feedback)", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(
      <SliderInput label="Loan amount" value={500_000} min={100_000} max={1_000_000} step={1000} onChange={onChange} />,
    );

    const slider = screen.getByLabelText("Loan amount", { selector: 'input[type="range"]' }) as HTMLInputElement;

    fireEvent.change(slider, { target: { value: "777000" } });

    // The slider's own DOM value updates immediately, before the debounce
    // timer fires — confirming the local-visual-state design actually
    // decouples "looks responsive" from "when onChange fires".
    expect(slider.value).toBe("777000");
    expect(onChange).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("typing in the number field and pressing Enter calls onChange immediately (not debounced — only the slider drag path is)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SliderInput label="Loan amount" value={500_000} min={100_000} max={1_000_000} step={1000} onChange={onChange} />,
    );

    const numberField = screen.getByLabelText("Loan amount", { selector: "input[type='number']" });
    await user.clear(numberField);
    await user.type(numberField, "600000{Enter}");

    expect(onChange).toHaveBeenCalledWith(600000);
  });

  it("clamps a typed value outside [min, max] before calling onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SliderInput label="Loan amount" value={500_000} min={100_000} max={1_000_000} step={1000} onChange={onChange} />,
    );

    const numberField = screen.getByLabelText("Loan amount", { selector: "input[type='number']" });
    await user.clear(numberField);
    await user.type(numberField, "5000000");
    await user.tab(); // blur to commit

    expect(onChange).toHaveBeenCalledWith(1_000_000); // clamped to max
  });

  it("resyncs its displayed value when the value prop changes externally (e.g. a remote sync update), without requiring user interaction", () => {
    const { rerender } = render(
      <SliderInput label="Loan amount" value={500_000} min={100_000} max={1_000_000} step={1000} onChange={vi.fn()} />,
    );

    rerender(
      <SliderInput label="Loan amount" value={750_000} min={100_000} max={1_000_000} step={1000} onChange={vi.fn()} />,
    );

    const slider = screen.getByLabelText("Loan amount", { selector: 'input[type="range"]' }) as HTMLInputElement;
    expect(slider.value).toBe("750000");
  });
});
