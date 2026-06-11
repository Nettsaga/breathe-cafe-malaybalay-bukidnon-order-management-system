"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { peso } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import type { OrderEvent } from "@/lib/events";

// Customer-facing order tracker. Subscribes to the same SSE stream the kitchen
// uses, so the status updates live as the barista advances the order.

const STEPS: { status: OrderStatus; label: string; emoji: string; sub: string }[] = [
  { status: "queued", label: "Order received", emoji: "🧾", sub: "Sent to the kitchen" },
  { status: "preparing", label: "Preparing", emoji: "👨‍🍳", sub: "We're making it now" },
  { status: "ready", label: "Ready", emoji: "🔔", sub: "Ready for serving" },
  { status: "served", label: "Served", emoji: "✅", sub: "Enjoy! 🤍" },
];

function stepIndex(status: OrderStatus): number {
  const i = STEPS.findIndex((s) => s.status === status);
  return i === -1 ? 0 : i; // "pending" maps to first step visually
}

export default function OrderStatusView({ initial }: { initial: Order }) {
  const [order, setOrder] = useState<Order>(initial);

  useEffect(() => {
    const es = new EventSource("/api/orders/stream");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as OrderEvent | { type: "ready" };
        if (
          (event.type === "updated" || event.type === "created") &&
          "order" in event &&
          event.order.id === initial.id
        ) {
          setOrder(event.order);
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    return () => es.close();
  }, [initial.id]);

  const current = stepIndex(order.status);

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="px-5 pt-8 pb-4 text-center">
        <p className="text-muted text-sm">{order.tableLabel}</p>
        <h1 className="text-2xl font-black">Order {order.id}</h1>
        <span className="inline-block mt-2 chip chip-idle">
          {order.paymentStatus === "paid" ? "Paid · GCash" : order.paymentStatus}
        </span>
      </header>

      <main className="flex-1 px-5 py-4 max-w-md mx-auto w-full">
        {/* Status timeline */}
        <div className="card p-5 mb-5">
          <div className="space-y-1">
            {STEPS.map((step, i) => {
              const done = i < current;
              const active = i === current;
              return (
                <div key={step.status} className="flex items-start gap-4">
                  {/* rail */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                        done || active
                          ? "bg-brand text-white"
                          : "bg-surface-muted text-muted"
                      } ${active ? "ring-4 ring-brand-light" : ""}`}
                    >
                      {step.emoji}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`w-0.5 h-8 ${done ? "bg-brand" : "bg-border"}`}
                      />
                    )}
                  </div>
                  <div className={`pt-1.5 ${!done && !active ? "opacity-40" : ""}`}>
                    <p className="font-bold leading-tight">{step.label}</p>
                    <p className="text-muted text-xs">{step.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order summary */}
        <div className="card p-5">
          <h2 className="font-bold mb-3">Order summary</h2>
          <div className="space-y-2">
            {order.items.map((it, i) => (
              <div
                key={`${it.menuItemId}-${i}`}
                className="flex justify-between text-sm gap-3"
              >
                <span className="text-muted min-w-0">
                  {it.qty}× {it.name}
                  {it.optionsLabel && (
                    <span className="block text-xs text-muted/70">
                      {it.optionsLabel}
                    </span>
                  )}
                </span>
                <span className="whitespace-nowrap">{peso(it.price * it.qty)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-bold text-lg pt-3 mt-3 border-t border-border">
            <span>Total</span>
            <span className="text-brand">{peso(order.total)}</span>
          </div>
        </div>

        <Link href={`/t/${order.tableId}/menu`} className="btn-ghost w-full mt-5 block text-center">
          Order more
        </Link>
      </main>
    </div>
  );
}
