"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Trash2 } from "lucide-react";
import { useCart } from "@/lib/store";
import type { Table } from "@/lib/types";
import BottomNav from "./BottomNav";
import OrderSummaryPanel from "./OrderSummaryPanel";

export default function CartView({ table }: { table: Table }) {
  const { setTable, lines, clear } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setTable(table.id, table.label);
  }, [table.id, table.label, setTable]);

  if (!mounted) return null;

  const menuHref = `/t/${table.id}/menu`;

  return (
    <div className="flex-1 flex flex-col bg-background lg:pl-24 xl:pl-28">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur px-5 pt-6 pb-3">
        <div className="max-w-md lg:max-w-4xl mx-auto w-full flex items-center gap-3">
          <Link
            href={menuHref}
            className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center"
            aria-label="Back to menu"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl lg:text-3xl font-semibold">My Order</h1>
            <p className="text-muted text-sm">{table.label} · Dine-in</p>
          </div>
          {lines.length > 0 && (
            <button
              onClick={clear}
              className="lg:hidden flex items-center gap-1 text-sm font-medium text-danger px-3 py-2 rounded-full hover:bg-danger/10 active:scale-95 transition"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-5 pb-44 lg:pb-12 max-w-md lg:max-w-4xl mx-auto w-full">
        <OrderSummaryPanel table={table} variant="page" />
      </main>

      <BottomNav tableId={table.id} />
    </div>
  );
}
