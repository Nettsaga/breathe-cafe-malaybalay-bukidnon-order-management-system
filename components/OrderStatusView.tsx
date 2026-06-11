"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Coffee, Check } from "lucide-react";
import { peso, shortTime } from "@/lib/format";
import type { Order } from "@/lib/types";
import type { OrderEvent } from "@/lib/events";

// Customer-facing order tracker. Subscribes to the same SSE stream the kitchen
// uses; while the order is in progress it shows a continuous loader cycling
// through playful "we're on it" phrases.

const MAKING_PHRASES = [
  "Grinding the beans…",
  "Pulling a fresh shot…",
  "Steaming the milk just right…",
  "Swirling the foam…",
  "Coaxing out the crema…",
  "Whisking the matcha…",
  "Baking something good…",
  "Warming the oven…",
  "Tempering the chocolate…",
  "Stacking the ice nice and high…",
  "Plating it pretty…",
  "Counting the sprinkles…",
  "Adding a little love…",
  "Chasing the perfect pour…",
  "Quality-control sip in progress…",
  "Almost there, promise…",
];

const READY_PHRASES = [
  "Ready when you are.",
  "Fresh off the bar.",
  "Come and get it.",
  "Your table is calling.",
];

export default function OrderStatusView({ initial }: { initial: Order }) {
  const [order, setOrder] = useState<Order>(initial);
  const [tick, setTick] = useState(0);

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

  const isCompleted = order.status === "completed";
  const isReady = order.status === "ready";

  // Continuously cycle the playful phrases while the order is in progress.
  useEffect(() => {
    if (isCompleted) return;
    const id = setInterval(() => setTick((t) => t + 1), 2400);
    return () => clearInterval(id);
  }, [isCompleted]);

  const pool = isReady ? READY_PHRASES : MAKING_PHRASES;
  const phrase = isCompleted
    ? "Order complete — enjoy :>"
    : pool[tick % pool.length];

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur px-5 pt-8 pb-4 text-center">
        <p className="text-muted text-sm">{order.tableLabel}</p>
        <h1 className="text-xl lg:text-3xl font-semibold">Order {order.id}</h1>
        <span className="inline-block mt-2 chip bg-success/15 text-success">
          {order.paymentStatus === "paid" ? "Paid · GCash" : order.paymentStatus}
        </span>
      </header>

      <main className="flex-1 px-5 py-5 lg:py-10 max-w-md lg:max-w-3xl mx-auto w-full">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
        {/* Continuous loader + cycling phrases */}
        <div className="card p-7 mb-5 lg:mb-0 flex flex-col items-center text-center">
          <div className="relative w-28 h-28 lg:w-40 lg:h-40 mb-5">
            {isCompleted ? (
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="w-28 h-28 lg:w-40 lg:h-40 rounded-full bg-success text-white flex items-center justify-center"
              >
                <Check className="w-12 h-12 lg:w-16 lg:h-16" strokeWidth={2.5} />
              </motion.div>
            ) : (
              <>
                {/* spinning ring */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "conic-gradient(var(--brand), color-mix(in srgb, var(--brand) 15%, transparent) 60%, transparent 78%)",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                />
                <div className="absolute inset-[7px] rounded-full bg-surface flex items-center justify-center">
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                  >
                    <Coffee className="w-10 h-10 lg:w-14 lg:h-14 text-brand" strokeWidth={1.8} />
                  </motion.span>
                </div>
              </>
            )}
          </div>

          {/* status caption */}
          <span
            className={`chip text-xs mb-2 capitalize ${
              isReady ? "bg-success/15 text-success" : "chip-idle"
            }`}
          >
            {order.status === "pending" ? "In the queue" : order.status}
          </span>

          {/* cycling phrase */}
          <div className="h-7 lg:h-9 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={phrase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-lg lg:text-2xl font-semibold"
              >
                {phrase}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="text-muted text-xs mt-1">
            {isCompleted
              ? "Thanks for ordering with us."
              : "Hang tight — we'll keep this updated live."}
          </p>
        </div>

        {/* Receipt */}
        <div className="receipt shadow-[0_6px_24px_rgba(28,36,64,0.08)] px-6 pt-6 pb-7 font-mono text-foreground">
          <div className="text-center mb-3">
            <p className="font-semibold tracking-[0.15em] text-sm">BREATHE CAFE</p>
            <p className="text-[11px] text-muted">Malaybalay, Bukidnon</p>
          </div>

          <div className="border-t border-dashed border-border/80 my-3" />

          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted">{order.tableLabel}</span>
              <span className="text-muted">{shortTime(order.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Order</span>
              <span>{order.id}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-border/80 my-3" />

          <div className="space-y-2">
            {order.items.map((it, i) => (
              <div key={`${it.menuItemId}-${i}`} className="text-[13px]">
                <div className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="text-muted">{it.qty}×</span> {it.name}
                  </span>
                  <span className="whitespace-nowrap">{peso(it.price * it.qty)}</span>
                </div>
                {it.optionsLabel && (
                  <p className="text-[11px] text-muted pl-5">{it.optionsLabel}</p>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-border/80 my-3" />

          <div className="flex justify-between font-semibold text-sm">
            <span>TOTAL</span>
            <span>{peso(order.total)}</span>
          </div>

          <div className="border-t border-dashed border-border/80 my-3" />

          <p className="text-center text-[11px] text-muted">
            {order.paymentStatus === "paid" ? "PAID · GCash · QR Ph" : "UNPAID"}
          </p>
          {order.paymentRef && (
            <p className="text-center text-[11px] text-muted">
              Ref: {order.paymentRef}
            </p>
          )}
          <p className="text-center text-xs mt-3">Salamat — see you again :&gt;</p>
        </div>

        <Link
          href={`/t/${order.tableId}/menu`}
          className="btn-ghost w-full mt-5 block text-center lg:col-span-2"
        >
          Order more
        </Link>
        </div>
        {/* end loader + receipt grid */}
      </main>
    </div>
  );
}
