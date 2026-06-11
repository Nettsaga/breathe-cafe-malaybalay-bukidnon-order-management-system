// In-memory pub/sub bridging order mutations → SSE streams.
//
// Proposal-stage only: this lives in a single Node process, so it works for one
// server instance (e.g. `next dev` or a single Vercel/Node instance). A
// multi-instance production deploy would replace this with Redis pub/sub or a
// database-backed channel — the SSE route and callers stay the same.

import { EventEmitter } from "events";
import type { Order } from "./types";

export type OrderEvent =
  | { type: "created"; order: Order }
  | { type: "updated"; order: Order }
  | { type: "deleted"; orderId: string };

// Survive Next.js hot-reload by stashing the emitter on globalThis.
const globalForEvents = globalThis as unknown as {
  __orderBus?: EventEmitter;
};

const bus = globalForEvents.__orderBus ?? new EventEmitter();
bus.setMaxListeners(0); // many concurrent SSE clients (kitchen + customers)
globalForEvents.__orderBus = bus;

const CHANNEL = "order";

export function emitOrderEvent(event: OrderEvent): void {
  bus.emit(CHANNEL, event);
}

export function onOrderEvent(listener: (event: OrderEvent) => void): () => void {
  bus.on(CHANNEL, listener);
  return () => bus.off(CHANNEL, listener);
}
