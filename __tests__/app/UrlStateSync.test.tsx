import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppStateProvider, useAppStateContext } from "@/lib/state/context";
import { UrlStateSync } from "@/app/providers";

function Probe() {
  const { state } = useAppStateContext();
  return (
    <div>
      <span data-testid="principal">{state.primaryLoan.principal}</span>
      <span data-testid="rate">{state.primaryLoan.annualRate}</span>
      <span data-testid="tenure">{state.primaryLoan.tenureMonths}</span>
      <span data-testid="prepayment-count">{state.prepayments.length}</span>
    </div>
  );
}

function setUrlSearch(search: string) {
  window.history.pushState({}, "", `/${search}`);
}

describe("UrlStateSync", () => {
  afterEach(() => {
    // Reset the URL between tests so one test's query string can't leak
    // into the next.
    window.history.pushState({}, "", "/");
  });

  it("hydrates the primary loan from valid URL query params on mount", () => {
    setUrlSearch("?p=1200000&r=7.25&t=180");

    render(
      <AppStateProvider tabId="test-tab" enableSync={false}>
        <UrlStateSync />
        <Probe />
      </AppStateProvider>,
    );

    expect(screen.getByTestId("principal")).toHaveTextContent("1200000");
    expect(screen.getByTestId("rate")).toHaveTextContent("7.25");
    expect(screen.getByTestId("tenure")).toHaveTextContent("180");
  });

  it("hydrates prepayments from the URL alongside the loan", () => {
    setUrlSearch("?p=500000&r=8&t=60&pp=12:50000,24:30000");

    render(
      <AppStateProvider tabId="test-tab" enableSync={false}>
        <UrlStateSync />
        <Probe />
      </AppStateProvider>,
    );

    expect(screen.getByTestId("prepayment-count")).toHaveTextContent("2");
  });

  it("leaves the default loan untouched when the URL has no query params", () => {
    setUrlSearch("");

    render(
      <AppStateProvider tabId="test-tab" enableSync={false}>
        <UrlStateSync />
        <Probe />
      </AppStateProvider>,
    );

    // Default seeded loan from createInitialState.
    expect(screen.getByTestId("principal")).toHaveTextContent("2500000");
    expect(screen.getByTestId("rate")).toHaveTextContent("8.5");
    expect(screen.getByTestId("tenure")).toHaveTextContent("240");
  });

  it("leaves the default loan untouched when the URL params are malformed", () => {
    setUrlSearch("?p=not-a-number&r=8&t=60");

    render(
      <AppStateProvider tabId="test-tab" enableSync={false}>
        <UrlStateSync />
        <Probe />
      </AppStateProvider>,
    );

    expect(screen.getByTestId("principal")).toHaveTextContent("2500000");
  });

  it("does not set any prepayments when the URL has a valid loan but no prepayments param", () => {
    setUrlSearch("?p=500000&r=8&t=60");

    render(
      <AppStateProvider tabId="test-tab" enableSync={false}>
        <UrlStateSync />
        <Probe />
      </AppStateProvider>,
    );

    expect(screen.getByTestId("prepayment-count")).toHaveTextContent("0");
  });
});
