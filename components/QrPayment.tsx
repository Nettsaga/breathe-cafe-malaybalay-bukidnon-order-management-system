"use client";

// Adapted from bennyshark/memory-box-qr QrPayment.tsx.
// Same create-source → poll-every-3s → paid state machine and QR Ph display,
// but on success it marks the ORDER paid (which notifies the kitchen via SSE)
// and redirects the customer to their live confirmation page — instead of the
// photobooth print animation.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/store";
import { peso } from "@/lib/format";
import type { Order } from "@/lib/types";

type PaymentStatus =
  | "idle"
  | "creating"
  | "awaiting_scan"
  | "processing"
  | "paid"
  | "failed"
  | "expired";

// Safe fetch wrapper — never throws on empty or non-JSON bodies
async function fetchJSON(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch(url, options);
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    if (text) data = JSON.parse(text);
  } catch {
    data = { error: `Server returned non-JSON response (HTTP ${res.status})` };
  }
  return { ok: res.ok, status: res.status, data };
}

const POLL_INTERVAL_MS = 3000;

export default function QrPayment({ order }: { order: Order }) {
  const router = useRouter();
  const clearCart = useCart((s) => s.clear);

  // DEMO: PayMongo is charged a flat ₱1 no matter the order total, so the QR
  // flow can be tested cheaply. The order's real total is unchanged everywhere
  // else (cart, kitchen, receipts). Remove this override to charge the real total.
  const DEMO_CHARGE_PHP = 1;
  const chargeAmount = DEMO_CHARGE_PHP;

  const totalPrice = order.total;
  const description = `${order.id} · ${order.tableLabel}`;

  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCaptured = useRef(false); // prevent double-capture on fast polls

  // ─── Step 1: create source on mount ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function createSource() {
      setStatus("creating");
      setError(null);
      try {
        const { ok, data } = await fetchJSON("/api/paymongo/create-source", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountPhp: chargeAmount, description }),
        });
        if (!ok) throw new Error((data.error as string) ?? "Failed to create QR code");
        if (cancelled) return;
        setQrImage(data.qrImage as string);
        setSourceId(data.sourceId as string);
        setStatus("awaiting_scan");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
          setStatus("failed");
        }
      }
    }

    createSource();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Step 3: confirm + mark the order paid, then redirect ─────────────────
  async function capturePayment(sid: string) {
    try {
      // Verify the intent really succeeded (server-side check).
      const verify = await fetchJSON("/api/paymongo/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: sid }),
      });
      if (!verify.ok)
        throw new Error((verify.data.error as string) ?? "Failed to confirm payment");

      // Mark paid → the order (status "pending") now appears in the kitchen
      // queue via SSE. Kitchen advances it: pending → preparing → ready → completed.
      const patch = await fetchJSON(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "paid",
          paymentRef: sid,
        }),
      });
      if (!patch.ok)
        throw new Error((patch.data.error as string) ?? "Failed to update order");

      setStatus("paid");
      clearCart();
      // Brief success beat, then hand off to the live confirmation page.
      setTimeout(() => router.replace(`/order/${order.id}`), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment confirmation failed");
      setStatus("failed");
      isCaptured.current = false;
    }
  }

  // ─── Step 2: poll source status once we have a sourceId ───────────────────
  useEffect(() => {
    if (!sourceId || status !== "awaiting_scan") return;

    pollRef.current = setInterval(async () => {
      try {
        const { ok, data } = await fetchJSON(`/api/paymongo/source/${sourceId}`);
        if (!ok) return; // transient error, keep polling

        if (data.status === "paid" && !isCaptured.current) {
          isCaptured.current = true;
          clearInterval(pollRef.current!);
          setStatus("processing");
          await capturePayment(sourceId);
        } else if (data.status === "failed" || data.status === "expired") {
          clearInterval(pollRef.current!);
          setStatus(data.status === "expired" ? "expired" : "failed");
          setError("Payment was not completed. Please try again.");
        }
      } catch {
        // network hiccup, keep polling
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, status]);

  // ─── Render: paid ─────────────────────────────────────────────────────────
  if (status === "paid") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Animated draw-in circle + checkmark */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="relative w-24 h-24 mb-6"
        >
          <span className="absolute inset-0 rounded-full bg-success/15 animate-ping" />
          <svg viewBox="0 0 52 52" className="relative w-24 h-24">
            <motion.circle
              cx="26"
              cy="26"
              r="24"
              fill="none"
              stroke="var(--success)"
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.55, ease: "easeInOut" }}
            />
            <motion.path
              d="M16 27 l7 7 l14 -16"
              fill="none"
              stroke="var(--success)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.45, duration: 0.4, ease: "easeOut" }}
            />
          </svg>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-2xl font-semibold mb-1"
        >
          Payment received
        </motion.h2>
        <p className="text-muted flex items-center gap-2">
          <Spinner />
          Sending your order to the kitchen…
        </p>
      </div>
    );
  }

  // ─── Render: failed / expired ─────────────────────────────────────────────
  if (status === "failed" || status === "expired") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-danger"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {status === "expired" ? "QR Code Expired" : "Payment Failed"}
        </h2>
        <p className="text-muted text-sm mb-8 max-w-xs">
          {error ?? "Something went wrong. Please try again."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-brand w-full max-w-xs mb-3"
        >
          Generate new QR
        </button>
        <button
          onClick={() => router.push(`/t/${order.tableId}/menu`)}
          className="btn-ghost w-full max-w-xs"
        >
          Back to menu
        </button>
      </div>
    );
  }

  // ─── Render: main QR view ─────────────────────────────────────────────────
  const isLoading = status === "creating" || status === "idle";
  const isProcessing = status === "processing";

  return (
    <div className="flex-1 flex flex-col items-center px-6 py-8 text-center max-w-sm mx-auto w-full">
      <h2 className="text-2xl font-bold mb-1">Scan to Pay</h2>
      <p className="text-muted text-sm mb-2">
        Open GCash, Maya, or any QR Ph app and scan below.
      </p>
      <p className="text-muted/70 text-xs mb-7">
        Order {order.id} · {order.tableLabel}
      </p>

      {/* QR box */}
      <div className="w-60 h-60 bg-surface border border-border rounded-3xl flex items-center justify-center mb-6 relative overflow-hidden shadow-sm">
        {isLoading && (
          <div className="flex flex-col items-center gap-2 text-muted">
            <Spinner />
            <span className="text-xs">Generating QR…</span>
          </div>
        )}
        {isProcessing && (
          <div className="absolute inset-0 bg-surface/90 flex flex-col items-center justify-center gap-2 z-10">
            <Spinner />
            <span className="text-xs text-muted">Confirming…</span>
          </div>
        )}
        {qrImage && !isLoading && (
          <Image
            src={qrImage}
            alt="QR Ph payment code"
            width={220}
            height={220}
            className="w-full h-full object-contain p-3"
            priority
            unoptimized
          />
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-5">
        <span
          className={`w-2 h-2 rounded-full animate-pulse ${
            status === "awaiting_scan"
              ? "bg-warning"
              : status === "processing"
                ? "bg-brand"
                : "bg-muted"
          }`}
        />
        <span className="text-xs text-muted">
          {status === "awaiting_scan" && "Waiting for payment…"}
          {status === "processing" && "Confirming payment…"}
          {isLoading && "Preparing QR code…"}
        </span>
      </div>

      {/* Amount */}
      <div className="card w-full px-4 py-3 mb-3">
        <p className="text-muted text-xs uppercase tracking-wider mb-1">
          Amount Due
        </p>
        <p className="text-3xl font-bold text-brand">{peso(chargeAmount)}</p>
        <p className="text-muted text-xs mt-1">
          Demo mode · order total {peso(totalPrice)}
        </p>
      </div>

      <div className="flex gap-2 items-center mb-2">
        {["GCash", "Maya", "QR Ph"].map((name) => (
          <span
            key={name}
            className="text-[10px] font-semibold text-muted border border-border rounded px-2 py-1"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-8 h-8 animate-spin text-muted" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
