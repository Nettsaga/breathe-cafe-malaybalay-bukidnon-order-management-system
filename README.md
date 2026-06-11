# Breathe Cafe — QR Dine-In Ordering System

Scan-to-order web app for **Breathe Cafe** (Malaybalay, Bukidnon). Dine-in guests
scan the QR at their table, browse the menu on their phone, pay via **GCash / QR Ph
(PayMongo)**, and their order drops into the **kitchen queue in real time**.

> Proposal-stage build. Data is stored in JSON files (`/data`) behind a single
> abstraction (`lib/db.ts`) so it can be swapped for a real database later.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — brand colors are CSS variables in `app/globals.css`
- **Zustand** — per-table cart (persisted to localStorage)
- **Server-Sent Events** — live kitchen queue + customer status (`lib/events.ts`)
- **PayMongo QR Ph** — payment flow ported from `memory-box-qr` (`lib/paymongo.ts`)
- **qrcode** — generates printable per-table QR codes

## Setup

```bash
npm install
cp .env.example .env.local   # then edit .env.local
npm run dev                  # http://localhost:3000
```

`.env.local`:

```
PAYMONGO_SECRET_KEY=sk_test_xxxxxxxx   # PayMongo dashboard → Developers → API Keys
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Use the **test** secret key for the demo; swap to `sk_live_...` for production.

## Pages

Cozy, ZUS-style UI with a persistent bottom nav (Home · Menu · My Order) on the
customer screens. Delivery is shown as **"Coming soon"** (disabled).

| Route | Who | Purpose |
|---|---|---|
| `/` | — | Demo hub (links to the screens below) |
| `/t/[tableId]` | Customer | **Home** after scanning the table QR (greeting, promo, featured) |
| `/t/[tableId]/menu` | Customer | Menu — category sidebar + product grid |
| `/t/[tableId]/item/[itemId]` | Customer | Product detail + customization (Size / Sugar / Add-ons) |
| `/t/[tableId]/cart` | Customer | Order review + payment breakdown → place order |
| `/checkout/[orderId]` | Customer | PayMongo QR Ph payment |
| `/order/[orderId]` | Customer | Live order status |
| `/kitchen` | Staff | Live order queue + print tickets (shows chosen options) |
| `/admin` | Staff | Toggle item availability/price, generate table QR codes |

## Flow

1. Customer scans table QR → Home → Menu. Items with options open a **detail page**
   to pick Size / Sugar Level / Add-ons (prices update live); option-less items quick-add.
2. **My Order** → **Place order & pay** creates a `pending` order (`POST /api/orders`).
   The server **recomputes every price + the total from the menu options** — the client
   can't tamper with prices, and required/limit rules are enforced.
3. `/checkout/[orderId]` shows a QR Ph code; the client polls every 3s.
4. On payment success → order is marked `paid` + `queued` (`PATCH /api/orders/[id]`),
   which emits an SSE event.
5. `/kitchen` receives it live; the barista advances `preparing → ready → served`
   and prints the ticket (with the customer's chosen options). The customer's
   `/order/[orderId]` page updates live too.

## Customization

Menu items can declare `options` groups in `data/menu.json` (`single`/`multi`,
`required`, `max`, and per-choice `priceDelta`). The cart keys lines by
`menuItemId + chosen options`, so the same drink with different options are
separate lines. Theme colors are CSS variables in `app/globals.css`
(cool **ZUS navy + white**) — edit there to re-theme the whole app.

## Look & feel

Clean, cool, ZUS-style: products **float on subtle gray halos** (`.halo`, no card
borders), **lucide-react** icons, and **framer-motion** entrance/stagger motion.
Home has an **auto-sliding ads carousel** (`components/AdCarousel.tsx`, fed by
`data/promos.json`), a search bar, and a featured slider. The menu has **live
search** across all items, a category sidebar, and a promo strip.

## Notes / production checklist

- **JSON files aren't concurrency-safe** at scale — migrate `lib/db.ts` to Postgres
  or Sanity. Only that file changes.
- **SSE state is in-memory** (single instance). A multi-instance deploy needs Redis
  pub/sub or a DB-backed channel (`lib/events.ts`).
- Swap `window.print()` (browser print) for direct ESC/POS thermal printing if needed.
- Drop in Breathe Cafe's real logo + palette by editing the CSS variables in
  `app/globals.css` — every component reads from them.
- The `memory-box-qr/` folder is the reference clone of the original PayMongo
  implementation; it's excluded from the build via `tsconfig.json`.
```
