import { NextRequest, NextResponse } from "next/server";
import { updateMenuItem } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PatchBody {
  available?: unknown;
  price?: unknown;
}

// PATCH /api/menu/[id] — admin toggles availability or edits price.
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

  const patch: { available?: boolean; price?: number } = {};

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

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await updateMenuItem(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
