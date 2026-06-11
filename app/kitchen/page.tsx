"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { peso, shortTime } from "@/lib/format";
import { KITCHEN_STATUSES, NEXT_STATUS } from "@/lib/types";
import type { Order, OrderStatus } from "@/lib/types";
import type { OrderEvent } from "@/lib/events";
import KitchenTicket from "@/components/KitchenTicket";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  preparing: "bg-brand-light text-brand",
  ready: "bg-success/15 text-success",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
};

const ADVANCE_LABEL: Record<OrderStatus, string> = {
  pending: "Start preparing",
  preparing: "Mark ready",
  ready: "Complete order",
  completed: "Done",
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [connected, setConnected] = useState(false);
  const [printing, setPrinting] = useState<Order | null>(null);
  // Per-order prep checklist (client-only): orderId → one boolean per item line.
  const [checks, setChecks] = useState<Record<string, boolean[]>>({});

  const getChecks = (order: Order) =>
    checks[order.id] ?? order.items.map(() => false);

  const toggleItem = (order: Order, i: number) =>
    setChecks((prev) => {
      const arr = (prev[order.id] ?? order.items.map(() => false)).slice();
      arr[i] = !arr[i];
      return { ...prev, [order.id]: arr };
    });

  const toggleAll = (order: Order, value: boolean) =>
    setChecks((prev) => ({
      ...prev,
      [order.id]: order.items.map(() => value),
    }));

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
        if (event.type === "deleted") {
          setOrders((prev) => prev.filter((o) => o.id !== event.orderId));
        } else if ("order" in event && event.order) {
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
  // The tablet/phone's connected printer handles the rest.
  const printTicket = useCallback((order: Order) => {
    setPrinting(order);
    setTimeout(() => {
      window.print();
    }, 60);
  }, []);

  // Active board = paid orders still in pending/preparing/ready, oldest first.
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
          <h1 className="text-xl font-bold text-brand">Breathe Kitchen</h1>
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
            {active.map((order) => {
              // Multi-item orders get a prep checklist; the barista can't mark
              // the order Ready until every line is checked off.
              const multiItem = order.items.length > 1;
              const showChecklist =
                multiItem &&
                (order.status === "pending" || order.status === "preparing");
              const itemChecks = getChecks(order);
              const allChecked = order.items.every((_, i) => itemChecks[i]);
              const blockReady =
                NEXT_STATUS[order.status] === "ready" && multiItem && !allChecked;

              return (
                <div key={order.id} className="card p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-lg">{order.tableLabel}</span>
                    <span
                      className={`chip text-xs ${STATUS_STYLES[order.status]}`}
                    >
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted mb-3">
                    <span className="font-mono">{order.id}</span>
                    <span>{shortTime(order.createdAt)}</span>
                  </div>

                  {showChecklist && (
                    <label className="flex items-center justify-between gap-2 text-xs font-medium mb-2 cursor-pointer select-none">
                      Check all
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[var(--brand)]"
                        checked={allChecked}
                        onChange={(e) => toggleAll(order, e.target.checked)}
                      />
                    </label>
                  )}

                  <ul className="space-y-1.5 flex-1 mb-4">
                    {order.items.map((it, i) => (
                      <li
                        key={`${it.menuItemId}-${i}`}
                        className="flex gap-2 text-sm items-start"
                      >
                        <span className="font-bold text-brand">{it.qty}×</span>
                        <span
                          className={`flex-1 ${
                            showChecklist && itemChecks[i]
                              ? "line-through text-muted"
                              : ""
                          }`}
                        >
                          {it.name}
                          {it.optionsLabel && (
                            <span className="block text-xs text-muted">
                              {it.optionsLabel}
                            </span>
                          )}
                        </span>
                        {showChecklist && (
                          <input
                            type="checkbox"
                            className="w-4 h-4 mt-0.5 accent-[var(--brand)] shrink-0"
                            checked={itemChecks[i] ?? false}
                            onChange={() => toggleItem(order, i)}
                          />
                        )}
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
                      disabled={blockReady}
                      title={blockReady ? "Check off all items first" : undefined}
                      className="btn-brand flex-1 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {blockReady
                        ? `Check all (${order.items.filter((_, i) => itemChecks[i]).length}/${order.items.length})`
                        : ADVANCE_LABEL[order.status]}
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
              );
            })}
          </div>
        )}
      </main>

      {/* Hidden except when printing */}
      {printing && <KitchenTicket order={printing} />}
    </div>
  );
}
