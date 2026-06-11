import { NextRequest, NextResponse } from "next/server";
import { deleteOrder, getOrder, updateOrder } from "@/lib/db";
import { emitOrderEvent } from "@/lib/events";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "preparing",
  "ready",
  "completed",
];
const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "paid", "failed"];

// GET /api/orders/[id] — single order (confirmation page initial load).
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const order = await getOrder(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json(order);
}

interface PatchBody {
  status?: unknown;
  paymentStatus?: unknown;
  paymentRef?: unknown;
}

// PATCH /api/orders/[id] — advance kitchen status, or mark paid after payment.
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const patch: Partial<Order> = {};

  if (body.status !== undefined) {
    if (!ORDER_STATUSES.includes(body.status as OrderStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status as OrderStatus;
  }
  if (body.paymentStatus !== undefined) {
    if (!PAYMENT_STATUSES.includes(body.paymentStatus as PaymentStatus)) {
      return NextResponse.json({ error: "Invalid paymentStatus" }, { status: 400 });
    }
    patch.paymentStatus = body.paymentStatus as PaymentStatus;
  }
  if (typeof body.paymentRef === "string") {
    patch.paymentRef = body.paymentRef;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  let updated;
  try {
    updated = await updateOrder(id, patch);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update order" },
      { status: 500 }
    );
  }
  if (!updated) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  emitOrderEvent({ type: "updated", order: updated });
  return NextResponse.json(updated);
}

// DELETE /api/orders/[id] — admin removes an order (e.g. a mistaken or test one).
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const ok = await deleteOrder(id);
  if (!ok) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  emitOrderEvent({ type: "deleted", orderId: id });
  return NextResponse.json({ ok: true });
}
