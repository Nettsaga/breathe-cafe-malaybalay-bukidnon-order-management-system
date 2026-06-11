"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Plus, Minus, Trash2 } from "lucide-react";
import { useCart, type CartLine } from "@/lib/store";
import { peso } from "@/lib/format";
import type { Table } from "@/lib/types";

// Shared order summary — the single home for the line-item list, totals and the
// place-order network call. Rendered two ways:
//   • variant="page" → the full /cart page body (mobile + desktop 2-column).
//   • variant="rail" → the always-visible kiosk side panel on the desktop menu.
// Both read the same Zustand store, so adds anywhere reflect here instantly.
export default function OrderSummaryPanel({
  table,
  variant,
}: {
  table: Table;
  variant: "page" | "rail";
}) {
  const router = useRouter();
  const { lines, inc, dec, total, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const grandTotal = total();
  const menuHref = `/t/${table.id}/menu`;

  async function placeOrder() {
    if (lines.length === 0) return;
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: table.id,
          items: lines.map((l) => ({
            menuItemId: l.menuItemId,
            qty: l.qty,
            choiceIds: l.options.map((o) => o.choiceId),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not place order");
      router.push(`/checkout/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPlacing(false);
    }
  }

  // ─── Desktop kiosk side panel ─────────────────────────────────────────────
  if (variant === "rail") {
    const isEmpty = !mounted || lines.length === 0;
    return (
      <div className="card p-5 flex flex-col max-h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand" />
            Your order
          </h2>
          {!isEmpty && (
            <button
              onClick={clear}
              className="flex items-center gap-1 text-xs font-medium text-danger px-2.5 py-1.5 rounded-full hover:bg-danger/10 active:scale-95 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center text-center py-12 text-muted">
            <ShoppingBag className="w-10 h-10 mb-3 text-border" />
            <p className="text-sm">Your order is empty.</p>
            <p className="text-xs mt-1">Tap a product to add it here.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3 -mr-1 pr-1">
              {lines.map((l) => (
                <LineRow key={l.id} line={l} inc={inc} dec={dec} compact />
              ))}
            </div>

            <div className="border-t border-border mt-4 pt-4">
              <div className="flex justify-between font-bold text-lg mb-3">
                <span>Total</span>
                <span className="text-brand">{peso(grandTotal)}</span>
              </div>
              {error && (
                <p className="text-danger text-sm text-center mb-2">{error}</p>
              )}
              <button
                onClick={placeOrder}
                disabled={placing}
                className="btn-brand w-full py-4 text-lg flex items-center justify-center"
              >
                {placing ? "Placing order…" : "Place Order"}
              </button>
              <Link
                href={menuHref}
                className="block text-center text-sm text-muted hover:text-brand mt-3 transition-colors"
              >
                + Add more items
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── Full cart page body (mobile column + desktop 2-column) ───────────────
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 text-muted">
        <ShoppingBag className="w-12 h-12 mb-3 text-border" />
        <p>Your order is empty.</p>
        <Link href={menuHref} className="btn-brand inline-block mt-5">
          Browse menu
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 lg:items-start">
        {/* Line items */}
        <div className="space-y-3 lg:space-y-4">
          {lines.map((l) => (
            <LineRow key={l.id} line={l} inc={inc} dec={dec} />
          ))}

          <Link
            href={menuHref}
            className="btn-ghost w-full mt-3 block text-center text-sm"
          >
            + Add more items
          </Link>
        </div>

        {/* Payment details — sticks beside items on desktop */}
        <div className="card p-5 mt-4 lg:mt-0 lg:sticky lg:top-24">
          <h2 className="font-semibold mb-3">Payment details</h2>
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={peso(grandTotal)} muted />
            <Row label="Service charge" value="₱0" muted />
            <div className="border-t border-border pt-2 mt-2">
              <Row label="Grand Total" value={peso(grandTotal)} bold />
            </div>
          </div>
          <p className="text-muted text-xs mt-3">
            Pay securely with GCash / QR Ph on the next step.
          </p>
          {/* Desktop-only inline CTA (mobile uses the fixed bar below) */}
          {error && (
            <p className="hidden lg:block text-danger text-sm text-center mt-3">
              {error}
            </p>
          )}
          <button
            onClick={placeOrder}
            disabled={placing}
            className="btn-brand w-full mt-4 hidden lg:flex items-center justify-center"
          >
            {placing ? "Placing order…" : "Place Order"}
          </button>
        </div>
      </div>

      {/* Mobile sticky place-order bar (hidden on desktop — CTA lives in panel) */}
      <div className="lg:hidden fixed bottom-[60px] inset-x-0 z-20 px-4 pb-2">
        {error && (
          <p className="text-danger text-sm text-center mb-2 max-w-md mx-auto">
            {error}
          </p>
        )}
        <button
          onClick={placeOrder}
          disabled={placing}
          className="btn-brand w-full max-w-md mx-auto flex items-center justify-center shadow-xl"
        >
          {placing ? "Placing order…" : "Place Order"}
        </button>
      </div>
    </>
  );
}

// A single cart line — image, name, options, qty stepper, line total.
// `compact` trims it for the narrow desktop side rail.
function LineRow({
  line: l,
  inc,
  dec,
  compact,
}: {
  line: CartLine;
  inc: (id: string) => void;
  dec: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`card flex gap-3 ${compact ? "p-3" : "p-3 lg:p-4"}`}>
      {l.imageUrl && (
        <div
          className={`relative shrink-0 rounded-full overflow-hidden ${
            compact ? "w-14 h-14" : "w-16 h-16 lg:w-20 lg:h-20"
          }`}
        >
          <Image
            src={l.imageUrl}
            alt={l.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold leading-tight">{l.name}</h3>
        {l.options.length > 0 && (
          <p className="text-muted text-xs mt-0.5">
            {l.options.map((o) => o.choiceLabel).join(" · ")}
          </p>
        )}
        <p className="text-brand font-bold text-sm mt-1">{peso(l.unitPrice)}</p>
      </div>
      <div className="flex flex-col items-end justify-between">
        <div className="flex items-center gap-1.5 bg-surface-muted rounded-full px-1 py-1">
          <button
            onClick={() => dec(l.id)}
            className="w-7 h-7 rounded-full bg-surface text-brand flex items-center justify-center active:scale-90"
            aria-label="Remove one"
          >
            <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <span className="w-5 text-center font-bold text-sm">{l.qty}</span>
          <button
            onClick={() => inc(l.id)}
            className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center active:scale-90"
            aria-label="Add one"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
        <span className="text-sm font-bold">{peso(l.unitPrice * l.qty)}</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${bold ? "font-bold text-lg" : ""} ${
        muted ? "text-muted" : ""
      }`}
    >
      <span>{label}</span>
      <span className={bold ? "text-brand" : ""}>{value}</span>
    </div>
  );
}
