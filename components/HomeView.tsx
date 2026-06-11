"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  UtensilsCrossed,
  Bike,
  ChevronRight,
  Bean,
  Coffee,
  CupSoda,
  Leaf,
  Cherry,
  Croissant,
  CakeSlice,
  type LucideIcon,
} from "lucide-react";
import { useCart } from "@/lib/store";
import { peso } from "@/lib/format";
import type { MenuItem, Promo, Table } from "@/lib/types";
import AdCarousel from "./AdCarousel";
import BottomNav from "./BottomNav";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  Signature: Bean,
  "Hot Coffee": Coffee,
  "Iced Coffee": CupSoda,
  "Matcha Series": Leaf,
  "Fruit Tea": Cherry,
  Pastries: Croissant,
  Cakes: CakeSlice,
  Meals: UtensilsCrossed,
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function HomeView({
  table,
  featured,
  promos,
  categories,
}: {
  table: Table;
  featured: MenuItem[];
  promos: Promo[];
  categories: string[];
}) {
  const setTable = useCart((s) => s.setTable);
  useEffect(() => {
    setTable(table.id, table.label);
  }, [table.id, table.label, setTable]);

  const menuHref = `/t/${table.id}/menu`;

  return (
    <div className="flex-1 flex flex-col bg-background">
      <main className="flex-1 max-w-md mx-auto w-full px-5 pt-8 pb-6">
        {/* Greeting */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="flex items-center justify-between mb-4"
        >
          <div>
            <p className="text-2xl font-semibold leading-tight text-foreground">
              Hello, friend
            </p>
            <p className="text-muted text-sm mt-1">
              You&apos;re at{" "}
              <span className="font-semibold text-brand">{table.label}</span> ·
              Breathe Cafe
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center">
            <span className="text-xl">🌿</span>
          </div>
        </motion.div>

        {/* Search bar (links into the menu search) */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1}>
          <Link
            href={`${menuHref}?q=`}
            className="flex items-center gap-2 bg-surface-muted rounded-full px-4 py-3 text-muted mb-5"
          >
            <Search className="w-5 h-5 -scale-x-100" />
            <span className="text-sm">Search drinks, pastries…</span>
          </Link>
        </motion.div>

        {/* Ads carousel */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2}>
          <AdCarousel promos={promos} />
        </motion.div>

        {/* Order type tiles */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="grid grid-cols-2 gap-3 mt-6 mb-7"
        >
          <Link
            href={menuHref}
            className="card p-5 flex flex-col items-center text-center active:scale-95 transition-transform"
          >
            <span className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center mb-2">
              <UtensilsCrossed className="w-6 h-6 text-brand" />
            </span>
            <span className="font-bold">Dine-In</span>
            <span className="text-muted text-xs mt-0.5">Served to {table.label}</span>
          </Link>
          <div
            className="card p-5 flex flex-col items-center text-center opacity-70 cursor-not-allowed relative"
            aria-disabled
          >
            <span className="absolute top-3 right-3 bg-accent/15 text-accent text-[10px] font-bold rounded-full px-2 py-0.5">
              Soon
            </span>
            <span className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mb-2">
              <Bike className="w-6 h-6 text-muted" />
            </span>
            <span className="font-bold">Delivery</span>
            <span className="text-muted text-xs mt-0.5">Coming soon</span>
          </div>
        </motion.div>

        {/* Category shortcuts */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={4}
          className="mb-7"
        >
          <h3 className="font-semibold text-base mb-3">Categories</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICON[cat] ?? Coffee;
              return (
                <Link
                  key={cat}
                  href={`${menuHref}?c=${encodeURIComponent(cat)}`}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <span className="w-16 h-16 rounded-2xl bg-surface-muted flex items-center justify-center text-brand">
                    <Icon className="w-6 h-6" strokeWidth={1.7} />
                  </span>
                  <span className="text-[11px] font-medium text-muted text-center w-16 leading-tight">
                    {cat}
                  </span>
                </Link>
              );
            })}
          </div>
        </motion.section>

        {/* Featured */}
        {featured.length > 0 && (
          <motion.section
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={5}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base">Crowd favorites</h3>
              <Link
                href={menuHref}
                className="text-brand text-sm font-semibold flex items-center"
              >
                See all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
              {featured.map((item) => (
                <Link
                  key={item.id}
                  href={`/t/${table.id}/item/${item.id}`}
                  className="w-36 shrink-0 active:scale-95 transition-transform"
                >
                  <div className="relative w-full aspect-square mb-2 flex items-center justify-center">
                    <div className="absolute inset-0 halo" />
                    {item.imageUrl && (
                      <div className="relative w-[82%] aspect-square rounded-full overflow-hidden shadow-md">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                  {item.seriesLabel && (
                    <p className="series-label text-center">{item.seriesLabel}</p>
                  )}
                  <p className="font-semibold text-sm leading-snug line-clamp-1 text-center">
                    {item.name}
                  </p>
                  <p className="text-foreground/90 font-medium text-sm mt-0.5 text-center">
                    {peso(item.price)}
                  </p>
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </main>

      <BottomNav tableId={table.id} />
    </div>
  );
}
