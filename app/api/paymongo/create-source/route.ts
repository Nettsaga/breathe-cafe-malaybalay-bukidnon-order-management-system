// POST /api/paymongo/create-source
import { NextRequest, NextResponse } from "next/server";
import { createQRPhPayment } from "@/lib/paymongo";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.PAYMONGO_SECRET_KEY) {
      console.error("[paymongo/create-source] PAYMONGO_SECRET_KEY is not set");
      return NextResponse.json(
        { error: "Payment service is not configured. Contact support." },
        { status: 500 }
      );
    }

    let body: { amountPhp?: unknown; description?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { amountPhp, description } = body;

    if (!amountPhp || typeof amountPhp !== "number" || amountPhp <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be a positive number in PHP." },
        { status: 400 }
      );
    }

    const result = await createQRPhPayment(
      amountPhp,
      typeof description === "string" ? description : "Breathe Cafe order"
    );

    return NextResponse.json({
      // kept as "sourceId" so the frontend needs no changes
      sourceId: result.intentId,
      qrImage: result.qrImage,
      status: result.status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[paymongo/create-source] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
