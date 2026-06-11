import { NextRequest, NextResponse } from "next/server";
import { createOrder, getMenu, getOrders, getTable } from "@/lib/db";
import { emitOrderEvent } from "@/lib/events";
import type { Order, OrderItem } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/orders — list all (newest first). Used by the kitchen board on load.
export async function GET() {
  const orders = await getOrders();
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json(orders);
}

interface CreateBody {
  tableId?: unknown;
  items?: unknown;
}

function genId(): string {
  // Short, human-readable order ref, e.g. "BRC-7F3A9".
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BRC-${rand}`;
}

// POST /api/orders — create a pending order. Prices/total are computed
// server-side from the menu so the client can't tamper with them.
export async function POST(req: NextRequest) {
  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { tableId, items } = body;

  if (!tableId || typeof tableId !== "string") {
    return NextResponse.json({ error: "tableId is required" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Order has no items" }, { status: 400 });
  }

  const table = await getTable(tableId);
  if (!table) {
    return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  }

  const menu = await getMenu();
  const orderItems: OrderItem[] = [];

  for (const raw of items as Array<Record<string, unknown>>) {
    const menuItem = menu.find((m) => m.id === raw.menuItemId);
    const qty = Number(raw.qty);
    if (!menuItem) {
      return NextResponse.json(
        { error: `Item not found: ${String(raw.menuItemId)}` },
        { status: 400 }
      );
    }
    if (!menuItem.available) {
      return NextResponse.json(
        { error: `${menuItem.name} is currently unavailable` },
        { status: 409 }
      );
    }
    if (!Number.isFinite(qty) || qty < 1) {
      return NextResponse.json(
        { error: `Invalid quantity for ${menuItem.name}` },
        { status: 400 }
      );
    }

    // Resolve & validate selected option choices against the menu definition,
    // recomputing the unit price server-side (never trust client prices).
    const choiceIds: string[] = Array.isArray(raw.choiceIds)
      ? (raw.choiceIds as unknown[]).filter((c): c is string => typeof c === "string")
      : [];

    let unitPrice = menuItem.price;
    const labelParts: string[] = [];

    for (const group of menuItem.options ?? []) {
      const picked = group.choices.filter((c) => choiceIds.includes(c.id));
      if (group.required && group.type === "single" && picked.length !== 1) {
        return NextResponse.json(
          { error: `Please choose a ${group.name} for ${menuItem.name}` },
          { status: 400 }
        );
      }
      if (group.type === "multi" && group.max && picked.length > group.max) {
        return NextResponse.json(
          { error: `Too many ${group.name} for ${menuItem.name}` },
          { status: 400 }
        );
      }
      for (const c of picked) {
        unitPrice += c.priceDelta;
        labelParts.push(c.label);
      }
    }

    // Reject choice ids that don't belong to any of this item's groups.
    const validIds = new Set(
      (menuItem.options ?? []).flatMap((g) => g.choices.map((c) => c.id))
    );
    if (choiceIds.some((id) => !validIds.has(id))) {
      return NextResponse.json(
        { error: `Invalid option for ${menuItem.name}` },
        { status: 400 }
      );
    }

    orderItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: unitPrice,
      qty: Math.floor(qty),
      optionsLabel: labelParts.length ? labelParts.join(" · ") : undefined,
      notes: typeof raw.notes === "string" ? raw.notes : undefined,
    });
  }

  const total = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const now = new Date().toISOString();

  const order: Order = {
    id: genId(),
    tableId: table.id,
    tableLabel: table.label,
    items: orderItems,
    total,
    status: "pending",
    paymentStatus: "unpaid",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await createOrder(order);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to save order",
      },
      { status: 500 }
    );
  }
  emitOrderEvent({ type: "created", order });

  return NextResponse.json(order, { status: 201 });
}
