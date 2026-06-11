"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Check, Plus, Minus } from "lucide-react";
import { useCart, resolveSelected } from "@/lib/store";
import { peso } from "@/lib/format";
import type { MenuItem, Table } from "@/lib/types";

export default function ProductDetail({
  table,
  item,
}: {
  table: Table;
  item: MenuItem;
}) {
  const router = useRouter();
  const { setTable, addConfigured } = useCart();

  useEffect(() => {
    setTable(table.id, table.label);
  }, [table.id, table.label, setTable]);

  const [picks, setPicks] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const g of item.options ?? []) {
      init[g.id] =
        g.type === "single" && g.required && g.choices[0]
          ? [g.choices[0].id]
          : [];
    }
    return init;
  });
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function toggleSingle(groupId: string, choiceId: string) {
    setPicks((p) => ({ ...p, [groupId]: [choiceId] }));
  }
  function toggleMulti(groupId: string, choiceId: string, max?: number) {
    setPicks((p) => {
      const cur = p[groupId] ?? [];
      if (cur.includes(choiceId))
        return { ...p, [groupId]: cur.filter((c) => c !== choiceId) };
      if (max && cur.length >= max) return p;
      return { ...p, [groupId]: [...cur, choiceId] };
    });
  }

  const selected = useMemo(
    () => resolveSelected(item.options, picks),
    [item.options, picks]
  );
  const unitPrice = item.price + selected.reduce((s, o) => s + o.priceDelta, 0);

  function addToCart() {
    addConfigured(item, selected, qty);
    setAdded(true);
    setTimeout(() => router.push(`/t/${table.id}/menu`), 650);
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3 bg-background/95 backdrop-blur">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold truncate">{item.name}</span>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pb-40">
        {/* Floating hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-60 h-60 mx-auto my-4 flex items-center justify-center"
        >
          <div className="absolute inset-0 halo" />
          {item.imageUrl && (
            <div className="relative w-[82%] aspect-square rounded-full overflow-hidden shadow-xl">
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                sizes="240px"
                className="object-cover"
                priority
              />
            </div>
          )}
        </motion.div>

        <div className="text-center mb-7">
          {item.seriesLabel && <p className="series-label">{item.seriesLabel}</p>}
          <h1 className="text-2xl font-semibold mt-1">{item.name}</h1>
          <p className="text-muted text-sm mt-2 max-w-xs mx-auto">
            {item.description}
          </p>
        </div>

        {/* Option groups */}
        <div className="space-y-6 max-w-md mx-auto">
          {(item.options ?? []).map((group) => {
            const cur = picks[group.id] ?? [];
            return (
              <section key={group.id}>
                <div className="flex items-baseline gap-2 mb-2">
                  <h2 className="font-semibold">{group.name}</h2>
                  <span className="text-muted text-xs">
                    {group.type === "single"
                      ? group.required
                        ? "Required"
                        : "Pick one"
                      : `Up to ${group.max ?? group.choices.length}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {group.choices.map((choice) => {
                    const on = cur.includes(choice.id);
                    return (
                      <button
                        key={choice.id}
                        onClick={() =>
                          group.type === "single"
                            ? toggleSingle(group.id, choice.id)
                            : toggleMulti(group.id, choice.id, group.max)
                        }
                        className={`opt-card ${on ? "opt-card-on" : "opt-card-off"}`}
                      >
                        <span className="block font-semibold text-sm">
                          {choice.label}
                        </span>
                        <span className="block text-xs text-muted">
                          {choice.priceDelta > 0
                            ? `+${peso(choice.priceDelta)}`
                            : "Free"}
                        </span>
                        {on && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* Sticky add bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-border px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-muted rounded-full px-1 py-1">
            <button
              onClick={() => setQty((x) => Math.max(1, x - 1))}
              className="w-9 h-9 rounded-full bg-surface text-brand flex items-center justify-center active:scale-90"
            >
              <Minus className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <span className="w-6 text-center font-bold">{qty}</span>
            <button
              onClick={() => setQty((x) => x + 1)}
              className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center active:scale-90"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          <button
            onClick={addToCart}
            disabled={added}
            className="btn-brand flex-1 flex items-center justify-between"
          >
            <span>{added ? "Added ✓" : "Add to cart"}</span>
            <span>{peso(unitPrice * qty)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
