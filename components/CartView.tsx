"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShoppingBag, Plus, Minus } from "lucide-react";
import { useCart } from "@/lib/store";
import { peso } from "@/lib/format";
import type { Table } from "@/lib/types";
import BottomNav from "./BottomNav";

export default function CartView({ table }: { table: Table }) {
  const router = useRouter();
  const { setTable, lines, inc, dec, total } = useCart();
  const [mounted, setMounted] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setTable(table.id, table.label);
  }, [table.id, table.label, setTable]);

  if (!mounted) return null;

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

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link
          href={menuHref}
          className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center"
          aria-label="Back to menu"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">My Order</h1>
          <p className="text-muted text-sm">{table.label} · Dine-in</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-44 max-w-md mx-auto w-full">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-muted">
            <ShoppingBag className="w-12 h-12 mb-3 text-border" />
            <p>Your order is empty.</p>
            <Link href={menuHref} className="btn-brand inline-block mt-5">
              Browse menu
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {lines.map((l) => (
                <div key={l.id} className="card p-3 flex gap-3">
                  {l.imageUrl && (
                    <div className="relative w-16 h-16 shrink-0 rounded-full overflow-hidden">
                      <Image
                        src={l.imageUrl}
                        alt={l.name}
                        fill
                        sizes="64px"
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
                    <p className="text-brand font-bold text-sm mt-1">
                      {peso(l.unitPrice)}
                    </p>
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
                      <span className="w-5 text-center font-bold text-sm">
                        {l.qty}
                      </span>
                      <button
                        onClick={() => inc(l.id)}
                        className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center active:scale-90"
                        aria-label="Add one"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                    <span className="text-sm font-bold">
                      {peso(l.unitPrice * l.qty)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href={menuHref}
              className="btn-ghost w-full mt-3 block text-center text-sm"
            >
              + Add more items
            </Link>

            {/* Payment details */}
            <div className="card p-5 mt-4">
              <h2 className="font-semibold mb-3">Payment details</h2>
              <div className="space-y-2 text-sm">
                <Row label="Subtotal" value={peso(grandTotal)} muted />
                <Row label="Service charge" value="₱0" muted />
                <div className="border-t border-border pt-2 mt-2">
                  <Row
                    label="Grand Total"
                    value={peso(grandTotal)}
                    bold
                  />
                </div>
              </div>
              <p className="text-muted text-xs mt-3">
                Pay securely with GCash / QR Ph on the next step.
              </p>
            </div>
          </>
        )}
      </main>

      {/* Sticky place-order bar */}
      {lines.length > 0 && (
        <div className="fixed bottom-[60px] inset-x-0 z-20 px-4 pb-2">
          {error && (
            <p className="text-danger text-sm text-center mb-2 max-w-md mx-auto">
              {error}
            </p>
          )}
          <button
            onClick={placeOrder}
            disabled={placing}
            className="btn-brand max-w-md mx-auto flex items-center justify-between shadow-xl"
          >
            <span>{placing ? "Placing order…" : "Place order & pay"}</span>
            <span>{peso(grandTotal)}</span>
          </button>
        </div>
      )}

      <BottomNav tableId={table.id} />
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
