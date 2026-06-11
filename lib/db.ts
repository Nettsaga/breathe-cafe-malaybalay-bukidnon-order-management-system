// JSON-file data layer (proposal stage).
//
// Every read/write goes through this module. To move to a real database later
// (Postgres/Sanity/KV), reimplement these functions and nothing else changes.
//
// Writes are serialized through a per-file promise chain to avoid the classic
// read-modify-write corruption when two requests land at once.
//
// Hosting note: Vercel's app filesystem is READ-ONLY, so writes there would
// crash (EROFS) — which is why placing an order failed in production. We read
// the bundled seed data but redirect writes to /tmp (the only writable path on
// a Lambda). Caveat: /tmp is per-instance and wiped when the function is
// recycled, so orders aren't durable or shared across instances. For a real
// deployment, swap this module for a shared store (Vercel KV / Upstash /
// Postgres) — and replace the in-memory SSE bus in lib/events.ts too.

import { promises as fs } from "fs";
import path from "path";
import type { MenuItem, Order, Promo, Table } from "./types";

// Bundled, read-only seed data shipped with the app.
const SEED_DIR = path.join(process.cwd(), "data");
// Where writes land. Same as the seed dir locally; /tmp on Vercel.
const WRITE_DIR = process.env.VERCEL ? path.join("/tmp", "breathe-data") : SEED_DIR;

const FILES = {
  menu: "menu.json",
  tables: "tables.json",
  orders: "orders.json",
  promos: "promos.json",
} as const;

// Read the writable copy first (most recent), then fall back to the bundled
// seed. Locally both dirs are the same, so this is just one read.
async function readJson<T>(name: string, fallback: T): Promise<T> {
  const dirs = WRITE_DIR === SEED_DIR ? [SEED_DIR] : [WRITE_DIR, SEED_DIR];
  for (const dir of dirs) {
    try {
      const raw = await fs.readFile(path.join(dir, name), "utf8");
      return JSON.parse(raw) as T;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") continue;
      throw err;
    }
  }
  return fallback;
}

// One write chain per file so concurrent writers queue instead of clobber.
const writeChains = new Map<string, Promise<unknown>>();

function serialize<T>(name: string, task: () => Promise<T>): Promise<T> {
  const prev = writeChains.get(name) ?? Promise.resolve();
  const next = prev.then(task, task);
  // keep the chain alive but swallow errors so one failure doesn't poison it
  writeChains.set(
    name,
    next.catch(() => undefined)
  );
  return next;
}

async function writeJson<T>(name: string, data: T): Promise<void> {
  await fs.mkdir(WRITE_DIR, { recursive: true });
  await fs.writeFile(
    path.join(WRITE_DIR, name),
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

// ─── Menu ──────────────────────────────────────────────────────────────────

export function getMenu(): Promise<MenuItem[]> {
  return readJson<MenuItem[]>(FILES.menu, []);
}

// Slugify a name into a stable id, de-duplicating against the existing menu.
function uniqueMenuId(name: string, existing: MenuItem[]): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";
  let id = base;
  let n = 2;
  const taken = new Set(existing.map((m) => m.id));
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

export async function createMenuItem(
  input: Omit<MenuItem, "id">
): Promise<MenuItem> {
  return serialize(FILES.menu, async () => {
    const menu = await readJson<MenuItem[]>(FILES.menu, []);
    const item: MenuItem = { ...input, id: uniqueMenuId(input.name, menu) };
    menu.push(item);
    await writeJson(FILES.menu, menu);
    return item;
  });
}

export async function updateMenuItem(
  id: string,
  patch: Partial<Pick<MenuItem, "price" | "available" | "imageUrl">>
): Promise<MenuItem | null> {
  return serialize(FILES.menu, async () => {
    const menu = await readJson<MenuItem[]>(FILES.menu, []);
    const idx = menu.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    menu[idx] = { ...menu[idx], ...patch };
    await writeJson(FILES.menu, menu);
    return menu[idx];
  });
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  return serialize(FILES.menu, async () => {
    const menu = await readJson<MenuItem[]>(FILES.menu, []);
    const idx = menu.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    menu.splice(idx, 1);
    await writeJson(FILES.menu, menu);
    return true;
  });
}

// ─── Promos ──────────────────────────────────────────────────────────────────

export function getPromos(): Promise<Promo[]> {
  return readJson<Promo[]>(FILES.promos, []);
}

// ─── Tables ──────────────────────────────────────────────────────────────────

export function getTables(): Promise<Table[]> {
  return readJson<Table[]>(FILES.tables, []);
}

export async function getTable(id: string): Promise<Table | null> {
  const tables = await getTables();
  return tables.find((t) => t.id === id) ?? null;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export function getOrders(): Promise<Order[]> {
  return readJson<Order[]>(FILES.orders, []);
}

export async function getOrder(id: string): Promise<Order | null> {
  const orders = await getOrders();
  return orders.find((o) => o.id === id) ?? null;
}

export async function createOrder(order: Order): Promise<Order> {
  return serialize(FILES.orders, async () => {
    const orders = await readJson<Order[]>(FILES.orders, []);
    orders.push(order);
    await writeJson(FILES.orders, orders);
    return order;
  });
}

export async function updateOrder(
  id: string,
  patch: Partial<Order>
): Promise<Order | null> {
  return serialize(FILES.orders, async () => {
    const orders = await readJson<Order[]>(FILES.orders, []);
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    orders[idx] = { ...orders[idx], ...patch, updatedAt: new Date().toISOString() };
    await writeJson(FILES.orders, orders);
    return orders[idx];
  });
}

export async function deleteOrder(id: string): Promise<boolean> {
  return serialize(FILES.orders, async () => {
    const orders = await readJson<Order[]>(FILES.orders, []);
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) return false;
    orders.splice(idx, 1);
    await writeJson(FILES.orders, orders);
    return true;
  });
}
