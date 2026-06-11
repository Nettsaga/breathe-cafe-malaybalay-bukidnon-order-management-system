"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import {
  Search,
  X,
  Plus,
  ShoppingBag,
  Bean,
  Coffee,
  CupSoda,
  Leaf,
  Cherry,
  Croissant,
  CakeSlice,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useCart } from "@/lib/store";
import { peso } from "@/lib/format";
import type { MenuItem, Table } from "@/lib/types";
import BottomNav from "./BottomNav";
import OrderSummaryPanel from "./OrderSummaryPanel";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  Signature: Bean, // coffee bean — premium house line
  "Hot Coffee": Coffee,
  "Iced Coffee": CupSoda,
  "Matcha Series": Leaf,
  "Fruit Tea": Cherry,
  Pastries: Croissant,
  Cakes: CakeSlice,
  Meals: UtensilsCrossed,
};

const PER_CATEGORY = 4;

export default function MenuBrowser({
  table,
  menu,
  initialCategory,
  searchFocused,
}: {
  table: Table;
  menu: MenuItem[];
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

  // Auto-hiding "Headroom" header: hide on scroll down, reveal on scroll up.
  // Direction is read from the scroll motion value, so it never re-renders on
  // every scroll frame — only when the hidden/shown state actually flips.
  const { scrollY } = useScroll();
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastYRef = useRef(0);
  useMotionValueEvent(scrollY, "change", (y) => {
    const last = lastYRef.current;
    if (searchOpen || y < 80) {
      setHeaderHidden(false); // always show near the top / while searching
    } else if (Math.abs(y - last) > 6) {
      setHeaderHidden(y > last); // down → hide, up → show (with tolerance)
    }
    lastYRef.current = y;
  });

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
      { rootMargin: "-96px 0px -64% 0px", threshold: 0 }
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

  // Tapping the product always opens its detail/description page.
  function openDetail(item: MenuItem) {
    router.push(`/t/${table.id}/item/${item.id}`);
  }

  // The + button: quick-adds option-less items; opens detail to customize otherwise.
  function quickAdd(item: MenuItem) {
    if (item.options && item.options.length > 0) {
      openDetail(item);
    } else {
      addConfigured(item, []);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0 lg:pl-24 xl:pl-28">
      {/* Navy header — mobile only (auto-hides on scroll). Removed on desktop:
          the kiosk frame lets the nav + category rails run from the top. */}
      <motion.header
        variants={{ visible: { y: 0 }, hidden: { y: "-100%" } }}
        animate={headerHidden ? "hidden" : "visible"}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={`${searching ? "hidden" : "lg:hidden"} sticky top-0 z-20 bg-background border-b border-border text-foreground px-5 pt-6 pb-4`}
      >
        <h1 className="text-2xl font-semibold leading-tight text-foreground">Menu</h1>
        <p className="text-muted text-sm mt-1">
          <span className="font-semibold text-brand">{table.label}</span> · Dine-in
        </p>
      </motion.header>

      {/* Floating search button — mobile only (desktop searches via the panel bar) */}
      <button
        onClick={toggleSearch}
        aria-label={searchOpen ? "Close search" : "Search"}
        className="lg:hidden fixed top-4 right-4 z-40 w-11 h-11 rounded-full bg-white text-brand shadow-lg flex items-center justify-center active:scale-90 transition-transform"
      >
        {searchOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <Search className="w-5 h-5 -scale-x-100" />
        )}
      </button>

      {/* Mobile search field slides down from the top while searching */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden fixed top-0 inset-x-0 z-30 bg-background/95 backdrop-blur px-5 pt-4 pb-3"
          >
            <div className="flex items-center gap-2 bg-surface-muted rounded-full pl-4 pr-16 py-2.5">
              <Search className="w-5 h-5 text-muted -scale-x-100" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search drinks, pastries…"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body: category rail | grid-or-results | right column (search + order) */}
      <div className="flex items-start">
        {/* Category sidebar — sticky scroll-spy + jump nav; hidden on mobile search */}
        <aside
          className={`${searching ? "hidden lg:block" : ""} sticky self-start w-[84px] lg:w-28 shrink-0 max-h-[calc(100vh-80px)] overflow-y-auto no-scrollbar pt-2 lg:pt-4 pb-2 z-10 bg-background transition-[top] duration-300 lg:!top-0 ${
            headerHidden ? "top-2" : "top-[92px]"
          }`}
        >
          {categories.map((cat) => {
            const Icon = CATEGORY_ICON[cat] ?? Coffee;
            return (
              <button
                key={cat}
                onClick={() => jumpTo(cat)}
                className={`cat-item w-full lg:text-xs lg:py-4 ${
                  activeCat === cat ? "cat-item-active" : "cat-item-idle"
                }`}
              >
                <Icon
                  className="w-[22px] h-[22px] lg:w-7 lg:h-7"
                  strokeWidth={activeCat === cat ? 2 : 1.7}
                />
                {cat}
              </button>
            );
          })}
        </aside>

        {/* Middle column — search results, or the continuous category sections */}
        <main
          className={`flex-1 min-w-0 pb-40 lg:pb-16 ${
            searching
              ? "px-5 lg:px-8 pt-20 lg:pt-6 lg:border-l lg:border-border/70"
              : "pl-4 pr-4 lg:pl-8 lg:pr-8 pt-3 lg:pt-6 border-l border-border/70"
          }`}
        >
          {searching ? (
            <>
              <p className="text-muted text-sm mb-3">
                {searchResults.length} result
                {searchResults.length === 1 ? "" : "s"} for “{query}”
              </p>
              {searchResults.length === 0 ? (
                <div className="text-center py-20 text-muted">
                  <p className="text-4xl mb-2">🔍</p>
                  <p>No items found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 lg:gap-x-8 lg:gap-y-12">
                  {searchResults.map((item, i) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      index={i}
                      qty={mounted ? qtyOf(item.id) : 0}
                      onOpen={openDetail}
                      onAdd={quickAdd}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            sections.map(({ cat, items }) => (
              <section
                key={cat}
                data-cat={cat}
                ref={(el) => {
                  sectionRefs.current[cat] = el;
                }}
                className="mb-9 lg:mb-12 scroll-mt-[96px] lg:scroll-mt-[32px]"
              >
                <h2 className="text-[15px] lg:text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 lg:h-5 rounded-full bg-brand" />
                  {cat}
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 lg:gap-x-8 lg:gap-y-12">
                  {items.map((item, i) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      index={i}
                      qty={mounted ? qtyOf(item.id) : 0}
                      onOpen={openDetail}
                      onAdd={quickAdd}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>

        {/* Right column (desktop) — search bar above the always-visible order card */}
        <aside className="hidden lg:block lg:w-[360px] xl:w-[400px] shrink-0 sticky self-start top-0 pt-4 pr-6 pl-3">
          <div className="flex items-center gap-2 bg-surface-muted rounded-full px-4 py-3 mb-4">
            <Search className="w-5 h-5 text-muted -scale-x-100" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search drinks, pastries…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search">
                <X className="w-4 h-4 text-muted" />
              </button>
            )}
          </div>
          <OrderSummaryPanel table={table} variant="rail" />
        </aside>
      </div>

      {/* Floating cart bar — mobile only; desktop uses the persistent panel */}
      {cartCount > 0 && (
        <div className="lg:hidden fixed bottom-[60px] inset-x-0 z-20 px-4 pb-2">
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
  onOpen,
  onAdd,
}: {
  item: MenuItem;
  index: number;
  qty: number;
  onOpen: (item: MenuItem) => void; // tap product → description
  onAdd: (item: MenuItem) => void; // + → quick add / customize
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
      {/* Image — tapping it opens the product's description */}
      <div className="relative w-full aspect-square flex items-center justify-center mb-1">
        <button
          onClick={() => !soldOut && onOpen(item)}
          disabled={soldOut}
          aria-label={`View ${item.name}`}
          className="absolute inset-0 flex items-center justify-center"
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
        </button>
        {qty > 0 && (
          <span className="pointer-events-none absolute top-1 right-3 lg:top-3 lg:right-4 bg-brand text-white text-xs lg:text-sm font-bold rounded-full min-w-6 h-6 lg:min-w-8 lg:h-8 px-1.5 lg:px-2.5 flex items-center justify-center shadow-md ring-2 ring-background">
            {qty}
          </span>
        )}
        {/* + button — adds to cart (or opens customization for items with options) */}
        {!soldOut && (
          <button
            onClick={() => onAdd(item)}
            aria-label={`Add ${item.name}`}
            className="absolute bottom-0 right-3 w-9 h-9 lg:w-11 lg:h-11 rounded-full bg-accent text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            <Plus className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {item.seriesLabel && (
        <p className="series-label mb-0.5">{item.seriesLabel}</p>
      )}
      <button
        onClick={() => !soldOut && onOpen(item)}
        disabled={soldOut}
        className="font-semibold text-sm lg:text-base leading-snug line-clamp-2"
      >
        {item.name}
      </button>
      <p className="text-foreground/90 font-medium text-sm lg:text-base mt-1">
        {soldOut ? "Sold out" : peso(item.price)}
      </p>
    </motion.div>
  );
}
