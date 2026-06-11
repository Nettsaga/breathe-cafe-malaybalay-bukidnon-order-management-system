"use client";

// Per-table cart, persisted to localStorage so a refresh on the customer's
// phone doesn't lose their order. The table is captured when they scan the QR.
//
// Lines are COMPOSITE-KEYED on (menuItemId + sorted choice ids), so the same
// drink ordered with different options becomes separate lines.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MenuItem, OptionChoice, OptionGroup } from "./types";

export interface SelectedOption {
  groupId: string;
  groupName: string;
  choiceId: string;
  choiceLabel: string;
  priceDelta: number;
}

export interface CartLine {
  id: string; // `${menuItemId}|${sortedChoiceIds}`
  menuItemId: string;
  name: string;
  imageUrl?: string;
  basePrice: number;
  unitPrice: number; // base + Σ priceDelta
  qty: number;
  options: SelectedOption[];
}

interface CartState {
  tableId: string | null;
  tableLabel: string | null;
  lines: CartLine[];
  setTable: (id: string, label: string) => void;
  addConfigured: (item: MenuItem, selected: SelectedOption[], qty?: number) => void;
  inc: (lineId: string) => void;
  dec: (lineId: string) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  qtyOf: (menuItemId: string) => number;
  count: () => number;
  total: () => number;
}

export function lineKey(menuItemId: string, choiceIds: string[]): string {
  return `${menuItemId}|${[...choiceIds].sort().join(",")}`;
}

// Resolve a flat list of selected choices into SelectedOption[] given the item.
export function resolveSelected(
  groups: OptionGroup[] | undefined,
  picks: Record<string, string[]>
): SelectedOption[] {
  if (!groups) return [];
  const out: SelectedOption[] = [];
  for (const g of groups) {
    const chosen = picks[g.id] ?? [];
    for (const cid of chosen) {
      const choice = g.choices.find((c: OptionChoice) => c.id === cid);
      if (choice) {
        out.push({
          groupId: g.id,
          groupName: g.name,
          choiceId: choice.id,
          choiceLabel: choice.label,
          priceDelta: choice.priceDelta,
        });
      }
    }
  }
  return out;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      tableId: null,
      tableLabel: null,
      lines: [],

      setTable: (id, label) => {
        const prev = get().tableId;
        // Switching tables (new QR scan) starts a fresh cart.
        if (prev && prev !== id) {
          set({ tableId: id, tableLabel: label, lines: [] });
        } else {
          set({ tableId: id, tableLabel: label });
        }
      },

      addConfigured: (item, selected, qty = 1) =>
        set((state) => {
          const id = lineKey(
            item.id,
            selected.map((s) => s.choiceId)
          );
          const unitPrice =
            item.price + selected.reduce((sum, s) => sum + s.priceDelta, 0);

          const existing = state.lines.find((l) => l.id === id);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.id === id ? { ...l, qty: l.qty + qty } : l
              ),
            };
          }
          return {
            lines: [
              ...state.lines,
              {
                id,
                menuItemId: item.id,
                name: item.name,
                imageUrl: item.imageUrl,
                basePrice: item.price,
                unitPrice,
                qty,
                options: selected,
              },
            ],
          };
        }),

      inc: (lineId) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.id === lineId ? { ...l, qty: l.qty + 1 } : l
          ),
        })),

      dec: (lineId) =>
        set((state) => ({
          lines: state.lines
            .map((l) => (l.id === lineId ? { ...l, qty: l.qty - 1 } : l))
            .filter((l) => l.qty > 0),
        })),

      remove: (lineId) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.id !== lineId),
        })),

      clear: () => set({ lines: [] }),

      qtyOf: (menuItemId) =>
        get()
          .lines.filter((l) => l.menuItemId === menuItemId)
          .reduce((n, l) => n + l.qty, 0),

      count: () => get().lines.reduce((n, l) => n + l.qty, 0),

      total: () => get().lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
    }),
    { name: "breathe-cart-v2" }
  )
);
