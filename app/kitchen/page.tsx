"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { peso, shortTime } from "@/lib/format";
import { KITCHEN_STATUSES, NEXT_STATUS } from "@/lib/types";
import type { Order, OrderStatus } from "@/lib/types";
import type { OrderEvent } from "@/lib/events";
import KitchenTicket from "@/components/KitchenTicket";

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-warning/15 text-warning",
  preparing: "bg-brand-light text-brand",
  ready: "bg-success/15 text-success",
};

const ADVANCE_LABEL: Record<OrderStatus, string> = {
  pending: "—",
  queued: "Start preparing",
  preparing: "Mark ready",
  ready: "Mark served",
  served: "Done",
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [connected, setConnected] = useState(false);
  const [printing, setPrinting] = useState<Order | null>(null);

  // Initial load.
  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data: Order[]) => setOrders(data))
      .catch(() => {});
  }, []);

  // Live updates.
  useEffect(() => {
    const es = new EventSource("/api/orders/stream");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as OrderEvent | { type: "ready" };
        if ("order" in event && event.order) {
          setOrders((prev) => {
            const idx = prev.findIndex((o) => o.id === event.order.id);
            if (idx === -1) return [event.order, ...prev];
            const next = [...prev];
            next[idx] = event.order;
            return next;
          });
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, []);

  const advance = useCallback(async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    // SSE will echo the update back; no optimistic write needed.
  }, []);

  // Print: render the hidden ticket, then trigger the browser print dialog.
  const printTicket = useCallback((order: Order) => {
    setPrinting(order);
    setTimeout(() => {
      window.print();
    }, 60);
  }, []);

  // Active board = paid orders still in queued/preparing/ready, oldest first.
  const active = useMemo(
    () =>
      orders
        .filter(
          (o) =>
            o.paymentStatus === "paid" &&
            (KITCHEN_STATUSES as string[]).includes(o.status)
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [orders]
  );

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="no-print sticky top-0 z-10 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-brand">Breathe Kitchen</h1>
          <p className="text-muted text-sm">Live order queue</p>
        </div>
        <span
          className={`chip ${connected ? "bg-success/15 text-success" : "chip-idle"} flex items-center gap-2`}
        >
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-success animate-pulse" : "bg-muted"}`}
          />
          {connected ? "Live" : "Reconnecting…"}
        </span>
      </header>

      <main className="no-print flex-1 p-5">
        {active.length === 0 ? (
          <div className="text-center py-24 text-muted">
            <p className="text-5xl mb-4">☕️</p>
            <p>No active orders. New paid orders appear here instantly.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {active.map((order) => (
              <div key={order.id} className="card p-4 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-lg">{order.tableLabel}</span>
                  <span
                    className={`chip text-xs capitalize ${STATUS_STYLES[order.status]}`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted mb-3">
                  <span className="font-mono">{order.id}</span>
                  <span>{shortTime(order.createdAt)}</span>
                </div>

                <ul className="space-y-1.5 flex-1 mb-4">
                  {order.items.map((it, i) => (
                    <li key={`${it.menuItemId}-${i}`} className="flex gap-2 text-sm">
                      <span className="font-bold text-brand">{it.qty}×</span>
                      <span className="flex-1">
                        {it.name}
                        {it.optionsLabel && (
                          <span className="block text-xs text-muted">
                            {it.optionsLabel}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between mb-3 pt-2 border-t border-border">
                  <span className="text-muted text-sm">Total</span>
                  <span className="font-bold">{peso(order.total)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => advance(order)}
                    className="btn-brand flex-1 py-2.5 text-sm"
                  >
                    {ADVANCE_LABEL[order.status]}
                  </button>
                  <button
                    onClick={() => printTicket(order)}
                    className="btn-ghost px-4 py-2.5 text-sm"
                    aria-label="Print ticket"
                    title="Print ticket"
                  >
                    🖨️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Hidden except when printing */}
      {printing && <KitchenTicket order={printing} />}
    </div>
  );
}
