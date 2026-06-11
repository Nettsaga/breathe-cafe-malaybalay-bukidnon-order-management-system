import { NextResponse } from "next/server";
import { getMenu } from "@/lib/db";

// Always read fresh from disk so admin availability/price edits show immediately.
export const dynamic = "force-dynamic";

export async function GET() {
  const menu = await getMenu();
  return NextResponse.json(menu);
}
