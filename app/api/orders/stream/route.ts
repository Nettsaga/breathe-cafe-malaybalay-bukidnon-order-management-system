// GET /api/orders/stream — Server-Sent Events feed of order create/update events.
// The kitchen board and each customer's confirmation page subscribe here for
// live updates without polling.

import type { NextRequest } from "next/server";
import { onOrderEvent } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // EventEmitter + long-lived stream need Node runtime

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Initial hello so the client knows the stream is open.
      send({ type: "ready" });

      const unsubscribe = onOrderEvent((event) => send(event));

      // Keep-alive comment every 25s so proxies don't close an idle connection.
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`: keep-alive\n\n`));
      }, 25_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
