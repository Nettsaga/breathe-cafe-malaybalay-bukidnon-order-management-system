// Generates the playful "Table hub" content (ranking, stats, the usual order).
// Numbers are derived deterministically from the table id so they stay stable
// between renders (no hydration mismatch) — this is mock/demo data for now.

import type { MenuItem, Order } from "./types";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export type FactIcon = "coffee" | "flame" | "cup" | "trending" | "users";

export interface FunFact {
  icon: FactIcon;
  text: string;
}

export interface TableHub {
  customerNumber: number;
  rankLabel: string; // e.g. "#9 in today's brew crew"
  funFacts: FunFact[];
  usualItem: MenuItem | null; // "the usual" at this table
  popular: MenuItem[];
  recent: Order[];
}

export function buildTableHub(
  tableId: string,
  tableLabel: string,
  menu: MenuItem[],
  orders: Order[]
): TableHub {
  const h = hashStr(tableId);
  const tableOrders = orders.filter((o) => o.tableId === tableId);

  const customerNumber = tableOrders.length + 1 + (h % 9);
  const cupsToday = 48 + (h % 70);
  const avgDrinks = (1.5 + (h % 18) / 10).toFixed(1);
  const favPercent = 58 + (h % 30);

  const available = menu.filter((m) => m.available);
  const favItem =
    available.find((m) => m.featured) ??
    available[h % Math.max(available.length, 1)] ??
    null;

  // "The usual": most-ordered item at this table, else a sensible default.
  const counts = new Map<string, number>();
  for (const o of tableOrders)
    for (const it of o.items)
      counts.set(it.menuItemId, (counts.get(it.menuItemId) ?? 0) + it.qty);
  let usualId: string | null = null;
  let max = 0;
  for (const [id, c] of counts) if (c > max) [usualId, max] = [id, c];
  const usualItem =
    (usualId && available.find((m) => m.id === usualId)) || favItem;

  const rankLabel = `#${customerNumber} in today's brew crew`;

  const funFacts: FunFact[] = [
    {
      icon: "flame",
      text: favItem
        ? `${favPercent}% of this crew can't walk past the ${favItem.name}. Iconic.`
        : `This crew folds for an iced coffee, every single time.`,
    },
    {
      icon: "cup",
      text: `${tableLabel} averages ${avgDrinks} drinks a visit — full commitment, we respect it.`,
    },
    {
      icon: "trending",
      text: `${cupsToday} cups poured today and we're nowhere near done.`,
    },
  ];

  const popular = available
    .filter((m) => (m.featured || m.seriesLabel) && m.id !== usualItem?.id)
    .slice(0, 4);

  const recent = [...tableOrders].slice(-3).reverse();

  return { customerNumber, rankLabel, funFacts, usualItem, popular, recent };
}
