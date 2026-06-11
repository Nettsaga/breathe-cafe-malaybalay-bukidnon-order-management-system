"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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

const PER_CATEGORY = 4;

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
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    setTable(table.id, table.label);
  }, [table.id, table.label, setTable]);

  const categories = useMemo(
    () => Array.from(new Set(menu.map((m) => m.category))),
    [menu]
  );
  // 4 products per category, in continuous sections.
  const sections = useMemo(
    () =>
      categories.map((cat) => ({
        cat,
        items: menu.filter((m) => m.category === cat).slice(0, PER_CATEGORY),
      })),
    [categories, menu]
  );

  const [activeCat, setActiveCat] = useState(
    initialCategory && categories.includes(initialCategory)
      ? initialCategory
      : categories[0] ?? ""
  );
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(searchFocused);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  function toggleSearch() {
    setSearchOpen((open) => {
      if (open) setQuery("");
      return !open;
    });
  }

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const searchResults = menu.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.seriesLabel?.toLowerCase().includes(q)
  );

  const cartCount = mounted ? count() : 0;
  const cartTotal = mounted ? total() : 0;

  // Scroll-spy on the viewport: highlight the section sitting under the header.
  useEffect(() => {
    if (searching) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const cat = (visible[0]?.target as HTMLElement | undefined)?.dataset.cat;
        if (cat) setActiveCat(cat);
      },
      { rootMargin: "-120px 0px -68% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [searching, sections]);

  // Jump to a category section (and to a deep-linked category on mount).
  function jumpTo(cat: string) {
    setActiveCat(cat);
    sectionRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  useEffect(() => {
    if (initialCategory && sectionRefs.current[initialCategory]) {
      jumpTo(initialCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTap(item: MenuItem) {
    if (item.options && item.options.length > 0) {
      router.push(`/t/${table.id}/item/${item.id}`);
    } else {
      addConfigured(item, []);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0">
      {/* Header — title with a sleek search icon beside it */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur px-5 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">Menu</h1>
          <button
            onClick={toggleSearch}
            aria-label={searchOpen ? "Close search" : "Search"}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-90 ${
              searchOpen ? "bg-brand text-white" : "bg-surface-muted text-foreground"
            }`}
          >
            {searchOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Search className="w-5 h-5 -scale-x-100" />
            )}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex items-center gap-2 bg-surface-muted rounded-full px-4 py-2.5">
                <Search className="w-5 h-5 text-muted -scale-x-100" />
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
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Search results take over the whole view */}
      {searching ? (
        <main className="flex-1 px-5 py-4 pb-40">
          <p className="text-muted text-sm mb-3">
            {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for
            “{query}”
          </p>
          {searchResults.length === 0 ? (
            <div className="text-center py-20 text-muted">
              <p className="text-4xl mb-2">🔍</p>
              <p>No items found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6">
              {searchResults.map((item, i) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  index={i}
                  qty={mounted ? qtyOf(item.id) : 0}
                  onTap={handleTap}
                />
              ))}
            </div>
          )}
        </main>
      ) : (
        <div className="flex items-start">
          {/* Category sidebar = sticky scroll-spy + jump nav */}
          <aside className="sticky top-[68px] self-start w-[84px] shrink-0 max-h-[calc(100vh-68px-64px)] overflow-y-auto no-scrollbar py-2 z-10 bg-background">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => jumpTo(cat)}
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

          {/* Continuous sections (page scrolls) */}
          <main className="flex-1 px-4 pt-2 pb-40 min-w-0">
            {promo && (
              <div
                className="rounded-2xl p-4 mb-5 text-white flex items-center gap-3"
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

            {sections.map(({ cat, items }) => (
              <section
                key={cat}
                data-cat={cat}
                ref={(el) => {
                  sectionRefs.current[cat] = el;
                }}
                className="mb-7 scroll-mt-[80px]"
              >
                <h2 className="font-black text-lg mb-3 flex items-center gap-2">
                  <span>{CATEGORY_EMOJI[cat]}</span>
                  {cat}
                </h2>
                <div className="grid grid-cols-2 gap-x-3 gap-y-6">
                  {items.map((item, i) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      index={i}
                      qty={mounted ? qtyOf(item.id) : 0}
                      onTap={handleTap}
                    />
                  ))}
                </div>
              </section>
            ))}
          </main>
        </div>
      )}

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

// Floating product: circular image on a subtle halo, tan series label, price.
function ProductCard({
  item,
  index,
  qty,
  onTap,
}: {
  item: MenuItem;
  index: number;
  qty: number;
  onTap: (item: MenuItem) => void;
}) {
  const soldOut = !item.available;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{
        delay: Math.min(index, 4) * 0.05,
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`flex flex-col items-center text-center ${soldOut ? "opacity-50" : ""}`}
    >
      <button
        onClick={() => !soldOut && onTap(item)}
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
        {qty > 0 && (
          <span className="absolute top-1 right-3 bg-brand text-white text-xs font-bold rounded-full min-w-6 h-6 px-1.5 flex items-center justify-center shadow">
            {qty}
          </span>
        )}
        {!soldOut && (
          <span className="absolute bottom-0 right-3 w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform">
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </span>
        )}
      </button>

      {item.seriesLabel && <p className="series-label">{item.seriesLabel}</p>}
      <button
        onClick={() => !soldOut && onTap(item)}
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
}
