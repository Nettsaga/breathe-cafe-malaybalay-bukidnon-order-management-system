// Domain models for the Breathe Cafe ordering system.

export interface OptionChoice {
  id: string;
  label: string;
  priceDelta: number; // PHP added to the base price
}

export interface OptionGroup {
  id: string;
  name: string; // e.g. "Sugar Level"
  type: "single" | "multi";
  required?: boolean;
  max?: number; // for multi groups
  choices: OptionChoice[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number; // PHP (base)
  category: string;
  imageUrl?: string;
  available: boolean;
  seriesLabel?: string; // colored caps label above the name, e.g. "BEST SELLER"
  featured?: boolean; // surfaced on the Home screen
  options?: OptionGroup[];
}

export interface Table {
  id: string; // e.g. "table-7" — encoded in the QR
  label: string; // e.g. "Table 7"
}

export interface Promo {
  id: string;
  title: string;
  subtitle: string;
  voucher?: string; // display-only code
  emoji: string; // simple decorative glyph
  from: string; // gradient start (hex)
  to: string; // gradient end (hex)
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number; // PHP, unit price at time of order (base + options)
  qty: number;
  optionsLabel?: string; // e.g. "Large · 50% Sugar · +Pearls"
  notes?: string;
}

export type OrderStatus =
  | "pending" // created, awaiting payment
  | "queued" // paid, sent to kitchen
  | "preparing"
  | "ready"
  | "served";

export type PaymentStatus = "unpaid" | "paid" | "failed";

export interface Order {
  id: string;
  tableId: string;
  tableLabel: string;
  items: OrderItem[];
  total: number; // PHP
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentRef?: string; // PayMongo payment intent id
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// Active statuses shown on the kitchen board, in display order.
export const KITCHEN_STATUSES: OrderStatus[] = ["queued", "preparing", "ready"];

// What the next status button advances to.
export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending: "queued",
  queued: "preparing",
  preparing: "ready",
  ready: "served",
  served: null,
};
