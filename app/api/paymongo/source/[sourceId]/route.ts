// app/api/paymongo/source/[sourceId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPaymentIntentStatus } from "@/lib/paymongo";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ sourceId: string }> }
) {
  // Next.js 15+: params is a Promise — must be awaited
  const { sourceId } = await context.params;

  if (!sourceId) {
    return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
  }

  try {
    const { status } = await getPaymentIntentStatus(sourceId);

    let mappedStatus: string;

    if (status === "succeeded") {
      mappedStatus = "paid";
    } else if (status === "processing") {
      // Still in-flight — keep polling
      mappedStatus = "awaiting_scan";
    } else if (status === "payment_failed") {
      mappedStatus = "failed";
    } else {
      // awaiting_next_action | awaiting_payment_method
      mappedStatus = "awaiting_scan";
    }

    return NextResponse.json({ sourceId, status: mappedStatus, rawStatus: status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[paymongo/source]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
