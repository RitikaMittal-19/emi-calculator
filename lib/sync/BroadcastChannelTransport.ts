import type { SyncEngine, SyncWireMessage } from "./SyncEngine";

const CHANNEL_NAME = "emi-calculator-sync-v1";

/**
 * BroadcastChannel-based SyncEngine. Versioned channel name (v1 suffix) so
 * a future incompatible wire-format change can run a v2 channel side by
 * side without old and new tabs misinterpreting each other's messages.
 *
 * BroadcastChannel only delivers messages to OTHER same-origin contexts,
 * never back to the sender — so there's no need to filter out our own
 * messages here; that's a browser-native guarantee, not something this
 * class needs to implement defensively.
 */
export class BroadcastChannelTransport implements SyncEngine {
  private channel: BroadcastChannel;

  constructor() {
    this.channel = new BroadcastChannel(CHANNEL_NAME);
  }

  send(message: SyncWireMessage): void {
    this.channel.postMessage(message);
  }

  subscribe(handler: (message: SyncWireMessage) => void): () => void {
    const listener = (event: MessageEvent<SyncWireMessage>) => {
      handler(event.data);
    };
    this.channel.addEventListener("message", listener);
    return () => this.channel.removeEventListener("message", listener);
  }

  close(): void {
    this.channel.close();
  }
}
