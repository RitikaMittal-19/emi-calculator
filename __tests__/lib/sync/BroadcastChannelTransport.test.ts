import { afterEach, describe, expect, it, vi } from "vitest";
import { BroadcastChannelTransport } from "@/lib/sync/BroadcastChannelTransport";
import type { SyncWireMessage } from "@/lib/sync/SyncEngine";

describe("BroadcastChannelTransport", () => {
  let transports: BroadcastChannelTransport[] = [];

  afterEach(() => {
    for (const transport of transports) {
      transport.close();
    }
    transports = [];
  });

  function makeTransport(): BroadcastChannelTransport {
    const transport = new BroadcastChannelTransport();
    transports.push(transport);
    return transport;
  }

  it("delivers a message sent on one instance to a subscriber on another instance", async () => {
    const sender = makeTransport();
    const receiver = makeTransport();

    const received: SyncWireMessage[] = [];
    receiver.subscribe((message) => received.push(message));

    const testMessage: SyncWireMessage = { kind: "STATE_REQUEST", requestingTabId: "tab-a" };
    sender.send(testMessage);

    // BroadcastChannel delivery is asynchronous even within the same process.
    await vi.waitFor(() => {
      expect(received).toHaveLength(1);
    });
    expect(received[0]).toEqual(testMessage);
  });

  it("does NOT deliver a sender's own message back to itself", async () => {
    const transport = makeTransport();
    const received: SyncWireMessage[] = [];
    transport.subscribe((message) => received.push(message));

    transport.send({ kind: "STATE_REQUEST", requestingTabId: "tab-a" });

    // Give any (incorrect) self-delivery a chance to occur before asserting none did.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(received).toHaveLength(0);
  });

  it("delivers to multiple independent subscribers on the same instance", async () => {
    const sender = makeTransport();
    const receiver = makeTransport();

    const receivedA: SyncWireMessage[] = [];
    const receivedB: SyncWireMessage[] = [];
    receiver.subscribe((m) => receivedA.push(m));
    receiver.subscribe((m) => receivedB.push(m));

    sender.send({ kind: "STATE_REQUEST", requestingTabId: "tab-a" });

    await vi.waitFor(() => {
      expect(receivedA).toHaveLength(1);
      expect(receivedB).toHaveLength(1);
    });
  });

  it("unsubscribe stops further delivery to that specific handler", async () => {
    const sender = makeTransport();
    const receiver = makeTransport();

    const received: SyncWireMessage[] = [];
    const unsubscribe = receiver.subscribe((m) => received.push(m));

    sender.send({ kind: "STATE_REQUEST", requestingTabId: "first" });
    await vi.waitFor(() => expect(received).toHaveLength(1));

    unsubscribe();

    sender.send({ kind: "STATE_REQUEST", requestingTabId: "second" });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Still just the one message from before unsubscribing.
    expect(received).toHaveLength(1);
  });

  it("a closed transport no longer receives messages", async () => {
    const sender = makeTransport();
    const receiver = makeTransport();

    const received: SyncWireMessage[] = [];
    receiver.subscribe((m) => received.push(m));

    receiver.close();
    // Remove from cleanup list since we've already closed it manually.
    transports = transports.filter((t) => t !== receiver);

    sender.send({ kind: "STATE_REQUEST", requestingTabId: "tab-a" });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(received).toHaveLength(0);
  });

  it("delivers an ACTION-kind message with its full action payload intact", async () => {
    const sender = makeTransport();
    const receiver = makeTransport();

    const received: SyncWireMessage[] = [];
    receiver.subscribe((m) => received.push(m));

    const actionMessage: SyncWireMessage = {
      kind: "ACTION",
      action: {
        type: "SET_THEME",
        payload: "dark",
        meta: { tabId: "tab-a", timestamp: 12345, origin: "local" },
      },
    };
    sender.send(actionMessage);

    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(received[0]).toEqual(actionMessage);
  });
});
