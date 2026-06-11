import { NextRequest, NextResponse } from "next/server";
import { deleteMenuItem, updateMenuItem } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PatchBody {
  available?: unknown;
  price?: unknown;
  imageUrl?: unknown;
}

// PATCH /api/menu/[id] — admin toggles availability, edits price, or sets image.
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

  const patch: { available?: boolean; price?: number; imageUrl?: string } = {};

  if (body.available !== undefined) {
    if (typeof body.available !== "boolean") {
      return NextResponse.json({ error: "available must be boolean" }, { status: 400 });
    }
    patch.available = body.available;
  }
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }
    patch.price = Math.round(price);
  }
  if (body.imageUrl !== undefined) {
    if (typeof body.imageUrl !== "string" || body.imageUrl.length === 0) {
      return NextResponse.json({ error: "Invalid imageUrl" }, { status: 400 });
    }
    patch.imageUrl = body.imageUrl;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await updateMenuItem(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

// DELETE /api/menu/[id] — admin removes a product from the menu.
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const ok = await deleteMenuItem(id);
  if (!ok) {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
