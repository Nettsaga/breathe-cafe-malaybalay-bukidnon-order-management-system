// app/api/paymongo/create-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPaymentIntentStatus } from "@/lib/paymongo";

export async function POST(req: NextRequest) {
  try {
    let body: { sourceId?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { sourceId } = body;

    if (!sourceId || typeof sourceId !== "string") {
      return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
    }

    const { status } = await getPaymentIntentStatus(sourceId);

    if (status !== "succeeded") {
      console.warn(
        `[paymongo/create-payment] Not yet succeeded. intentId=${sourceId} status=${status}`
      );
      return NextResponse.json(
        {
          error: `Payment not yet complete (status: ${status}). Please wait.`,
          rawStatus: status,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ paymentId: sourceId, status: "paid" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[paymongo/create-payment]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
