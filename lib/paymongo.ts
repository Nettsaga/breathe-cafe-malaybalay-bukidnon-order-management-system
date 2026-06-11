// lib/paymongo.ts
// PayMongo Payment Intent + QR Ph implementation.
// Ported near-verbatim from bennyshark/memory-box-qr (proven in production).
// Flow: Create Intent → Create QR Ph Method → Attach → poll until succeeded.

const PAYMONGO_BASE = "https://api.paymongo.com/v1";

/** Base64-encoded "SECRET_KEY:" for Basic auth */
function authHeader(): string {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error("PAYMONGO_SECRET_KEY is not set in environment variables.");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

/** Shared fetch wrapper with JSON error unwrapping */
async function pmFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${PAYMONGO_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...(options.headers ?? {}),
    },
  });

  const json = await res.json();

  if (!res.ok) {
    const detail =
      json?.errors?.[0]?.detail ??
      json?.error?.message ??
      `PayMongo error (HTTP ${res.status})`;
    console.error(`[paymongo] ${options.method ?? "GET"} ${path} failed:`, json);
    throw new Error(detail);
  }

  return json as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PMIntent {
  data: {
    id: string;
    attributes: {
      status: string;
      client_key: string;
      next_action?: {
        type: string;
        // Actual PayMongo QR Ph response shape (type: "consume_qr"):
        code?: {
          id: string;
          amount: number;
          label: string;
          image_url: string; // the real QR image field
        };
        // Legacy / documented shape (type: "qr_code") — kept as fallback:
        qr_code?: {
          qr_image?: string;
          image?: string;
        };
      };
    };
  };
}

interface PMMethod {
  data: { id: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// createQRPhPayment
// ─────────────────────────────────────────────────────────────────────────────

export async function createQRPhPayment(
  amountPhp: number,
  description: string
): Promise<{ intentId: string; qrImage: string; status: string }> {
  const amountCentavos = Math.round(amountPhp * 100);

  // 1. Create Payment Intent
  const intentResponse = await pmFetch<PMIntent>("/payment_intents", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountCentavos,
          payment_method_allowed: ["qrph"],
          currency: "PHP",
          description,
          capture_type: "automatic",
        },
      },
    }),
  });

  const intentId = intentResponse.data.id;
  const clientKey = intentResponse.data.attributes.client_key;
  console.log(`[paymongo] Created intent: ${intentId}`);

  // 2. Create QR Ph Payment Method
  const methodResponse = await pmFetch<PMMethod>("/payment_methods", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          type: "qrph",
        },
      },
    }),
  });

  const paymentMethodId = methodResponse.data.id;
  console.log(`[paymongo] Created payment method: ${paymentMethodId}`);

  // 3. Attach Payment Method → get QR image
  const attachResponse = await pmFetch<PMIntent>(
    `/payment_intents/${intentId}/attach`,
    {
      method: "POST",
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: paymentMethodId,
            client_key: clientKey,
          },
        },
      }),
    }
  );

  const attachedAttrs = attachResponse.data.attributes;
  const nextAction = attachedAttrs.next_action;

  console.log(
    `[paymongo] Attached. Intent status: ${attachedAttrs.status}`,
    "next_action type:", nextAction?.type
  );

  // PayMongo QR Ph actually returns next_action.type = "consume_qr"
  // with the image at next_action.code.image_url — NOT next_action.qr_code.qr_image.
  // We try all known field paths so this survives any future API change.
  const qrImage =
    nextAction?.code?.image_url ??      // actual live API response
    nextAction?.qr_code?.qr_image ??   // documented shape (may appear in future)
    nextAction?.qr_code?.image ??      // older API versions
    null;

  if (!qrImage) {
    throw new Error(
      "PayMongo did not return a QR code image. " +
      "next_action was: " + JSON.stringify(nextAction)
    );
  }

  return {
    intentId,
    qrImage,
    status: attachedAttrs.status,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getPaymentIntentStatus
// Called by the poll route every 3s and by create-payment after success
// ─────────────────────────────────────────────────────────────────────────────

export async function getPaymentIntentStatus(
  intentId: string
): Promise<{ status: string }> {
  const response = await pmFetch<PMIntent>(`/payment_intents/${intentId}`);
  const status = response.data.attributes.status;
  console.log(`[paymongo] Intent ${intentId} → status: ${status}`);
  return { status };
}
