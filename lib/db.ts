// JSON-file data layer (proposal stage).
//
// Every read/write goes through this module. To move to a real database later
// (Postgres/Sanity), reimplement these functions and nothing else changes.
//
// Writes are serialized through a per-file promise chain to avoid the classic
// read-modify-write corruption when two requests land at once.

import { promises as fs } from "fs";
import path from "path";
import type { MenuItem, Order, Promo, Table } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

const FILES = {
  menu: path.join(DATA_DIR, "menu.json"),
  tables: path.join(DATA_DIR, "tables.json"),
  orders: path.join(DATA_DIR, "orders.json"),
  promos: path.join(DATA_DIR, "promos.json"),
} as const;

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return fallback;
    throw err;
  }
}

// One write chain per file path so concurrent writers queue instead of clobber.
const writeChains = new Map<string, Promise<unknown>>();

function serialize<T>(file: string, task: () => Promise<T>): Promise<T> {
  const prev = writeChains.get(file) ?? Promise.resolve();
  const next = prev.then(task, task);
  // keep the chain alive but swallow errors so one failure doesn't poison it
  writeChains.set(
    file,
    next.catch(() => undefined)
  );
  return next;
}

async function writeJson<T>(file: string, data: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

// ─── Menu ──────────────────────────────────────────────────────────────────

export function getMenu(): Promise<MenuItem[]> {
  return readJson<MenuItem[]>(FILES.menu, []);
}

export async function updateMenuItem(
  id: string,
  patch: Partial<Pick<MenuItem, "price" | "available">>
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
