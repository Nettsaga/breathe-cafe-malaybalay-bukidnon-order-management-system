"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Printer, Clock, Soup, CookingPot, BellRing } from "lucide-react";
import { peso, shortTime } from "@/lib/format";
import { NEXT_STATUS } from "@/lib/types";
import type { Order, OrderStatus } from "@/lib/types";
import type { OrderEvent } from "@/lib/events";
import KitchenTicket from "@/components/KitchenTicket";

const ADVANCE_LABEL: Record<OrderStatus, string> = {
  pending: "Start preparing",
  preparing: "Mark ready",
  ready: "Complete order",
  completed: "Done",
};

// The three live lanes of the board, in flow order.
const COLUMNS: {
  status: Extract<OrderStatus, "pending" | "preparing" | "ready">;
  label: string;
  Icon: typeof Soup;
  tint: string; // header pill
  bar: string; // column top accent
}[] = [
  { status: "pending", label: "New", Icon: BellRing, tint: "bg-warning/15 text-warning", bar: "bg-warning" },
  { status: "preparing", label: "Preparing", Icon: CookingPot, tint: "bg-brand-light text-brand", bar: "bg-brand" },
  { status: "ready", label: "Ready", Icon: Soup, tint: "bg-success/15 text-success", bar: "bg-success" },
];

// "12m" since the order came in — drives the urgency color on each ticket.
function minutesSince(createdAt: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
}
function elapsedLabel(mins: number) {
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function urgency(mins: number) {
  if (mins >= 20) return "text-danger";
  if (mins >= 10) return "text-warning";
  return "text-muted";
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [connected, setConnected] = useState(false);
  const [printing, setPrinting] = useState<Order | null>(null);
  const [now, setNow] = useState(0);
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

  // Live "now" tick so elapsed times stay fresh.
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

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
    // Optimistic: move the card immediately so the board feels instant. We
    // can't rely on the SSE echo here — on serverless the PATCH and the open
    // stream run on different instances, so the in-memory event bus never
    // delivers the update back to this client. Revert if the request fails.
    const prevStatus = order.status;
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: next } : o))
    );
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: prevStatus } : o))
      );
    }
  }, []);

  const printTicket = useCallback((order: Order) => {
    setPrinting(order);
    setTimeout(() => window.print(), 60);
  }, []);

  // Paid orders still in play, oldest first, grouped into the three lanes.
  const lanes = useMemo(() => {
    const active = orders
      .filter((o) => o.paymentStatus === "paid")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return {
      pending: active.filter((o) => o.status === "pending"),
      preparing: active.filter((o) => o.status === "preparing"),
      ready: active.filter((o) => o.status === "ready"),
      total: active.filter((o) =>
        ["pending", "preparing", "ready"].includes(o.status)
      ).length,
      oldest: active.find((o) =>
        ["pending", "preparing", "ready"].includes(o.status)
      ),
    };
  }, [orders]);

  const oldestMins = lanes.oldest && now ? minutesSince(lanes.oldest.createdAt, now) : 0;

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="no-print sticky top-0 z-10 bg-surface/90 backdrop-blur border-b border-border px-6 lg:px-10 py-4 lg:py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-brand">Breathe Kitchen</h1>
          <p className="text-muted text-sm">Live order queue</p>
        </div>
        <span
          className={`chip text-sm ${connected ? "bg-success/15 text-success" : "chip-idle"} flex items-center gap-2`}
        >
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-success animate-pulse" : "bg-muted"}`}
          />
          {connected ? "Live" : "Reconnecting…"}
        </span>
      </header>

      <main className="no-print flex-1 px-5 lg:px-10 py-6 lg:py-8 w-full max-w-[1600px] mx-auto">
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
          <StatCard label="Active tickets" value={String(lanes.total)} Icon={Soup} />
          <StatCard label="New" value={String(lanes.pending.length)} Icon={BellRing} accent="text-warning" />
          <StatCard label="Preparing" value={String(lanes.preparing.length)} Icon={CookingPot} accent="text-brand" />
          <StatCard
            label="Oldest waiting"
            value={lanes.oldest ? elapsedLabel(oldestMins) : "—"}
            Icon={Clock}
            accent={lanes.oldest ? urgency(oldestMins) : undefined}
          />
        </div>

        {lanes.total === 0 ? (
          <div className="text-center py-24 text-muted">
            <p className="text-6xl mb-4">☕️</p>
            <p className="text-lg">No active orders.</p>
            <p className="text-sm">New paid orders appear here instantly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-start">
            {COLUMNS.map((col) => {
              const colOrders = lanes[col.status];
              return (
                <section key={col.status} className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={`w-1.5 h-5 rounded-full ${col.bar}`} />
                    <col.Icon className="w-5 h-5 text-foreground/70" strokeWidth={1.8} />
                    <h2 className="font-bold text-lg">{col.label}</h2>
                    <span className={`chip text-xs ml-auto ${col.tint}`}>
                      {colOrders.length}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {colOrders.length === 0 ? (
                      <div className="rounded-3xl border-2 border-dashed border-border/70 py-10 text-center text-muted text-sm">
                        Nothing here
                      </div>
                    ) : (
                      colOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          mins={now ? minutesSince(order.createdAt, now) : 0}
                          checks={getChecks(order)}
                          onToggleItem={(i) => toggleItem(order, i)}
                          onToggleAll={(v) => toggleAll(order, v)}
                          onAdvance={() => advance(order)}
                          onPrint={() => printTicket(order)}
                        />
                      ))
                    )}
                  </div>
                </section>
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

function StatCard({
  label,
  value,
  Icon,
  accent = "text-brand",
}: {
  label: string;
  value: string;
  Icon: typeof Soup;
  accent?: string;
}) {
  return (
    <div className="card p-4 lg:p-5 flex items-center gap-3">
      <span className="w-11 h-11 rounded-2xl bg-surface-muted flex items-center justify-center shrink-0">
        <Icon className={`w-6 h-6 ${accent}`} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className={`text-2xl font-bold leading-none ${accent}`}>{value}</p>
        <p className="text-muted text-xs mt-1">{label}</p>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  mins,
  checks,
  onToggleItem,
  onToggleAll,
  onAdvance,
  onPrint,
}: {
  order: Order;
  mins: number;
  checks: boolean[];
  onToggleItem: (i: number) => void;
  onToggleAll: (v: boolean) => void;
  onAdvance: () => void;
  onPrint: () => void;
}) {
  const multiItem = order.items.length > 1;
  const showChecklist =
    multiItem && (order.status === "pending" || order.status === "preparing");
  const allChecked = order.items.every((_, i) => checks[i]);
  const blockReady =
    NEXT_STATUS[order.status] === "ready" && multiItem && !allChecked;

  return (
    <div className="card p-4 lg:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-lg lg:text-xl">{order.tableLabel}</span>
        <span className={`flex items-center gap-1 text-sm font-semibold ${urgency(mins)}`}>
          <Clock className="w-4 h-4" />
          {elapsedLabel(mins)}
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
            onChange={(e) => onToggleAll(e.target.checked)}
          />
        </label>
      )}

      <ul className="space-y-1.5 flex-1 mb-4">
        {order.items.map((it, i) => (
          <li
            key={`${it.menuItemId}-${i}`}
            className="flex gap-2 text-sm lg:text-base items-start"
          >
            <span className="font-bold text-brand">{it.qty}×</span>
            <span
              className={`flex-1 ${
                showChecklist && checks[i] ? "line-through text-muted" : ""
              }`}
            >
              {it.name}
              {it.optionsLabel && (
                <span className="block text-xs text-muted">{it.optionsLabel}</span>
              )}
            </span>
            {showChecklist && (
              <input
                type="checkbox"
                className="w-4 h-4 mt-1 accent-[var(--brand)] shrink-0"
                checked={checks[i] ?? false}
                onChange={() => onToggleItem(i)}
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
          onClick={onAdvance}
          disabled={blockReady}
          title={blockReady ? "Check off all items first" : undefined}
          className="btn-brand flex-1 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {blockReady
            ? `Check all (${order.items.filter((_, i) => checks[i]).length}/${order.items.length})`
            : ADVANCE_LABEL[order.status]}
        </button>
        <button
          onClick={onPrint}
          className="btn-ghost px-4 py-3 flex items-center justify-center"
          aria-label="Print ticket"
          title="Print ticket"
        >
          <Printer className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
