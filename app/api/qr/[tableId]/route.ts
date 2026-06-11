// GET /api/qr/[tableId] — PNG QR code that points at the table's menu URL.
// Used by the admin page to display/download printable table QR codes.

import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getTable } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ tableId: string }> }
) {
  const { tableId } = await context.params;

  const table = await getTable(tableId);
  if (!table) {
    return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  }

  // Prefer the configured public URL; fall back to the request origin.
  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || req.nextUrl.origin;
  const target = `${base}/t/${table.id}`;

  const png = await QRCode.toBuffer(target, {
    type: "png",
    width: 600,
    margin: 2,
    color: { dark: "#1f2421", light: "#ffffff" },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="${table.id}-qr.png"`,
    },
  });
}
