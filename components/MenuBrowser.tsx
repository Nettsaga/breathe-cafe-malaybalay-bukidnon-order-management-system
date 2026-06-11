"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, X, Plus, ShoppingBag, Ticket } from "lucide-react";
import { useCart } from "@/lib/store";
import { peso } from "@/lib/format";
import type { MenuItem, Promo, Table } from "@/lib/types";
import BottomNav from "./BottomNav";

const CATEGORY_EMOJI: Record<string, string> = {
  Signature: "⭐️",
  "Hot Coffee": "☕️",
  "Iced Coffee": "🧊",
  "Matcha Series": "🍵",
  "Fruit Tea": "🍓",
  Pastries: "🥐",
  Cakes: "🍰",
  Meals: "🍽️",
};

export default function MenuBrowser({
  table,
  menu,
  promo,
  initialCategory,
  searchFocused,
}: {
  table: Table;
  menu: MenuItem[];
  promo: Promo | null;
  initialCategory: string | null;
  searchFocused: boolean;
}) {
  const router = useRouter();
  const { setTable, addConfigured, qtyOf, count, total } = useCart();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTable(table.id, table.label);
  }, [table.id, table.label, setTable]);

  const categories = useMemo(
    () => Array.from(new Set(menu.map((m) => m.category))),
    [menu]
  );
  const [activeCat, setActiveCat] = useState(
    initialCategory && categories.includes(initialCategory)
      ? initialCategory
      : categories[0] ?? ""
  );
  const [query, setQuery] = useState("");

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (searchFocused) searchRef.current?.focus();
  }, [searchFocused]);

  const cartCount = mounted ? count() : 0;
  const cartTotal = mounted ? total() : 0;

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const results = searching
    ? menu.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          m.seriesLabel?.toLowerCase().includes(q)
      )
    : menu.filter((m) => m.category === activeCat);

  function handleTap(item: MenuItem) {
    if (item.options && item.options.length > 0) {
      router.push(`/t/${table.id}/item/${item.id}`);
    } else {
      addConfigured(item, []);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0">
      {/* Header + search */}
      <header className="px-5 pt-6 pb-3">
        <h1 className="text-2xl font-black">Menu</h1>
        <div className="mt-3 flex items-center gap-2 bg-surface-muted rounded-full px-4 py-2.5">
          <Search className="w-5 h-5 text-muted" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search drinks, pastries…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted"
          />
          {searching && (
            <button onClick={() => setQuery("")} aria-label="Clear search">
              <X className="w-4 h-4 text-muted" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Category sidebar (hidden while searching) */}
        {!searching && (
          <aside className="w-[84px] shrink-0 overflow-y-auto no-scrollbar py-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`cat-item w-full ${
                  activeCat === cat ? "cat-item-active" : "cat-item-idle"
                }`}
              >
                <span className="text-2xl leading-none">
                  {CATEGORY_EMOJI[cat] ?? "🍩"}
                </span>
                {cat}
              </button>
            ))}
          </aside>
        )}

        {/* Product grid */}
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-40">
          {!searching && (
            <h2 className="font-black text-lg mb-1">{activeCat}</h2>
          )}
          {searching && (
            <p className="text-muted text-sm mb-3">
              {results.length} result{results.length === 1 ? "" : "s"} for “{query}”
            </p>
          )}

          {/* Promo strip */}
          {!searching && promo && (
            <div
              className="rounded-2xl p-4 mb-4 text-white flex items-center gap-3"
              style={{
                backgroundImage: `linear-gradient(135deg, ${promo.from}, ${promo.to})`,
              }}
            >
              <span className="text-3xl">{promo.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight">{promo.title}</p>
                <p className="text-white/80 text-xs">{promo.subtitle}</p>
              </div>
              {promo.voucher && (
                <span className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0">
                  <Ticket className="w-3 h-3" />
                  {promo.voucher}
                </span>
              )}
            </div>
          )}

          {results.length === 0 ? (
            <div className="text-center py-20 text-muted">
              <p className="text-4xl mb-2">🔍</p>
              <p>No items found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6">
              {results.map((item, i) => {
                const itemQty = mounted ? qtyOf(item.id) : 0;
                const soldOut = !item.available;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: Math.min(i, 8) * 0.04,
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={`flex flex-col items-center text-center ${
                      soldOut ? "opacity-50" : ""
                    }`}
                  >
                    {/* Floating image on halo */}
                    <button
                      onClick={() => !soldOut && handleTap(item)}
                      disabled={soldOut}
                      className="relative w-full aspect-square flex items-center justify-center mb-1"
                    >
                      <div className="absolute inset-0 halo" />
                      {item.imageUrl && (
                        <div className="relative w-[82%] aspect-square rounded-full overflow-hidden shadow-md">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="(max-width:480px) 40vw, 160px"
                            className="object-cover"
                          />
                        </div>
                      )}
                      {itemQty > 0 && (
                        <span className="absolute top-1 right-3 bg-brand text-white text-xs font-bold rounded-full min-w-6 h-6 px-1.5 flex items-center justify-center shadow">
                          {itemQty}
                        </span>
                      )}
                      {/* Add FAB */}
                      {!soldOut && (
                        <span className="absolute bottom-0 right-3 w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                          <Plus className="w-5 h-5" strokeWidth={2.5} />
                        </span>
                      )}
                    </button>

                    {item.seriesLabel && (
                      <p className="series-label">{item.seriesLabel}</p>
                    )}
                    <button
                      onClick={() => !soldOut && handleTap(item)}
                      disabled={soldOut}
                      className="font-bold text-sm leading-tight line-clamp-2"
                    >
                      {item.name}
                    </button>
                    <p className="text-foreground font-bold text-sm mt-1">
                      {soldOut ? "Sold out" : peso(item.price)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-[60px] inset-x-0 z-20 px-4 pb-2">
          <Link
            href={`/t/${table.id}/cart`}
            className="btn-brand max-w-md mx-auto flex items-center justify-between shadow-xl"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span className="bg-white/25 rounded-full w-6 h-6 flex items-center justify-center text-sm">
                {cartCount}
              </span>
              View order
            </span>
            <span>{peso(cartTotal)}</span>
          </Link>
        </div>
      )}

      <BottomNav tableId={table.id} />
    </div>
  );
}
