import { NextRequest, NextResponse } from "next/server";
import { createMenuItem, getMenu } from "@/lib/db";

// Always read fresh from disk so admin availability/price edits show immediately.
export const dynamic = "force-dynamic";

export async function GET() {
  const menu = await getMenu();
  return NextResponse.json(menu);
}

interface CreateBody {
  name?: unknown;
  category?: unknown;
  price?: unknown;
  description?: unknown;
  imageUrl?: unknown;
}

// POST /api/menu — admin adds a new menu item.
export async function POST(req: NextRequest) {
  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category =
    typeof body.category === "string" ? body.category.trim() : "";
  const price = Number(body.price);

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  const item = await createMenuItem({
    name,
    category,
    price: Math.round(price),
    description:
      typeof body.description === "string" ? body.description.trim() : "",
    imageUrl:
      typeof body.imageUrl === "string" && body.imageUrl.length > 0
        ? body.imageUrl
        : undefined,
    available: true,
  });

  return NextResponse.json(item, { status: 201 });
}
