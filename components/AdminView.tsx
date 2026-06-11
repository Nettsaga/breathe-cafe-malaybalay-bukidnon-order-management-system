"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { peso, shortTime } from "@/lib/format";
import type { MenuItem, Order, OrderStatus, Table } from "@/lib/types";
import type { OrderEvent } from "@/lib/events";

type Tab = "orders" | "menu" | "qr";

export default function AdminView({
  initialMenu,
  tables,
  initialOrders,
}: {
  initialMenu: MenuItem[];
  tables: Table[];
  initialOrders: Order[];
}) {
  const [tab, setTab] = useState<Tab>("orders");

  const tabs: { id: Tab; label: string }[] = [
    { id: "orders", label: "Orders" },
    { id: "menu", label: "Menu" },
    { id: "qr", label: "Table QR codes" },
  ];

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="sticky top-0 z-20 bg-surface border-b border-border px-6 py-4 lg:px-10 lg:py-5">
        <h1 className="text-xl lg:text-2xl font-bold text-brand">Breathe Admin</h1>
        <p className="text-muted text-sm">Orders, menu &amp; table QR codes</p>
        <div className="flex gap-2 mt-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`chip ${tab === t.id ? "chip-active" : "chip-idle"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-5 lg:p-8 max-w-3xl lg:max-w-5xl mx-auto w-full">
        {tab === "orders" && <OrdersDashboard initialOrders={initialOrders} />}
        {tab === "menu" && <MenuManager initialMenu={initialMenu} />}
        {tab === "qr" && <QrManager tables={tables} />}
      </main>
    </div>
  );
}

// ─── Orders dashboard ────────────────────────────────────────────────────────

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-warning/15 text-warning",
  preparing: "bg-brand-light text-brand",
  ready: "bg-success/15 text-success",
  completed: "bg-surface-muted text-muted",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
};

function OrdersDashboard({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [busy, setBusy] = useState<string | null>(null);

  // Live updates so the dashboard mirrors the kitchen board.
  useEffect(() => {
    const es = new EventSource("/api/orders/stream");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as OrderEvent | { type: "ready" };
        if (event.type === "deleted") {
          setOrders((prev) => prev.filter((o) => o.id !== event.orderId));
        } else if ("order" in event && event.order) {
          setOrders((prev) => {
            const idx = prev.findIndex((o) => o.id === event.order.id);
            if (idx === -1) return [event.order, ...prev];
            const next = [...prev];
            next[idx] = event.order;
            return next;
          });
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, []);

  async function removeOrder(id: string) {
    if (!confirm(`Remove order ${id}? This can't be undone.`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (res.ok) setOrders((prev) => prev.filter((o) => o.id !== id));
    } finally {
      setBusy(null);
    }
  }

  const sorted = useMemo(
    () => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders]
  );

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.paymentStatus === "paid");
    return {
      active: paid.filter((o) => o.status !== "completed").length,
      completed: paid.filter((o) => o.status === "completed").length,
      revenue: paid.reduce((sum, o) => sum + o.total, 0),
    };
  }, [orders]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Active" value={String(stats.active)} />
        <StatCard label="Completed" value={String(stats.completed)} />
        <StatCard label="Revenue (paid)" value={peso(stats.revenue)} />
      </div>

      {sorted.length === 0 ? (
        <p className="text-muted text-center py-16">No orders yet.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sorted.map((order) => (
            <div key={order.id} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {order.tableLabel}{" "}
                    <span className="font-mono text-muted text-xs">
                      {order.id}
                    </span>
                  </p>
                  <p className="text-muted text-xs">
                    {order.items.reduce((n, it) => n + it.qty, 0)} item(s) ·{" "}
                    {shortTime(order.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`chip text-xs ${STATUS_STYLES[order.status]}`}>
                    {STATUS_LABEL[order.status]}
                  </span>
                  <span
                    className={`chip text-xs ${
                      order.paymentStatus === "paid"
                        ? "bg-success/15 text-success"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {order.paymentStatus === "paid" ? "Paid" : order.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="font-bold">{peso(order.total)}</span>
                <button
                  disabled={busy === order.id}
                  onClick={() => removeOrder(order.id)}
                  className="chip text-xs bg-danger/10 text-danger disabled:opacity-50"
                >
                  {busy === order.id ? "Removing…" : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-lg font-bold text-brand">{value}</p>
      <p className="text-muted text-xs">{label}</p>
    </div>
  );
}

// ─── Menu manager ─────────────────────────────────────────────────────────────

// Downscale a picked file to a small JPEG data URL — stands in for a real upload
// to object storage (simulation only). Keeps the demo's menu.json reasonable.
function fileToScaledDataUrl(file: File, maxW = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function MenuManager({ initialMenu }: { initialMenu: MenuItem[] }) {
  const [menu, setMenu] = useState(initialMenu);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function patch(
    id: string,
    body: Partial<Pick<MenuItem, "available" | "price" | "imageUrl">>
  ) {
    setBusy(id);
    try {
      const res = await fetch(`/api/menu/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const updated = await res.json();
      if (res.ok) {
        setMenu((m) => m.map((it) => (it.id === id ? updated : it)));
      }
    } finally {
      setBusy(null);
    }
  }

  async function removeItem(item: MenuItem) {
    if (!confirm(`Delete "${item.name}" from the menu?`)) return;
    setBusy(item.id);
    try {
      const res = await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
      if (res.ok) setMenu((m) => m.filter((it) => it.id !== item.id));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {adding ? (
        <AddItemForm
          onCancel={() => setAdding(false)}
          onCreated={(item) => {
            setMenu((m) => [...m, item]);
            setAdding(false);
          }}
        />
      ) : (
        <button onClick={() => setAdding(true)} className="btn-brand w-full py-2.5 text-sm">
          + Add menu item
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {menu.map((item) => (
          <MenuRow
            key={item.id}
            item={item}
            busy={busy === item.id}
            onToggleAvailable={() => patch(item.id, { available: !item.available })}
            onSetPrice={(price) => patch(item.id, { price })}
            onSetImage={(imageUrl) => patch(item.id, { imageUrl })}
            onDelete={() => removeItem(item)}
          />
        ))}
      </div>
    </div>
  );
}

function MenuRow({
  item,
  busy,
  onToggleAvailable,
  onSetPrice,
  onSetImage,
  onDelete,
}: {
  item: MenuItem;
  busy: boolean;
  onToggleAvailable: () => void;
  onSetPrice: (price: number) => void;
  onSetImage: (imageUrl: string) => void;
  onDelete: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToScaledDataUrl(file);
      // Simulated upload latency.
      await new Promise((r) => setTimeout(r, 700));
      onSetImage(dataUrl);
    } catch {
      /* ignore bad file */
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card p-3">
      <div className="flex items-center gap-3">
        {/* Image + upload (simulation) */}
        <button
          onClick={() => fileRef.current?.click()}
          className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-surface-muted group"
          title="Upload picture (simulation)"
        >
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized={item.imageUrl.startsWith("data:")}
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-muted text-xs">
              No image
            </span>
          )}
          <span className="absolute inset-0 bg-black/45 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading ? "Uploading…" : "Change"}
          </span>
          {uploading && (
            <span className="absolute inset-0 bg-black/55 text-white text-[10px] flex items-center justify-center">
              Uploading…
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />

        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{item.name}</p>
          <p className="text-muted text-xs">{item.category}</p>
        </div>

        {/* Editable price */}
        <label className="flex items-center gap-1 text-sm">
          <span className="text-muted">₱</span>
          <input
            type="number"
            defaultValue={item.price}
            min={0}
            className="w-20 rounded-lg border border-border px-2 py-1 bg-surface"
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v !== item.price) onSetPrice(v);
            }}
          />
        </label>
      </div>

      {/* Availability toggle + delete */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
        <button
          disabled={busy}
          onClick={onToggleAvailable}
          className={`chip text-xs disabled:opacity-50 ${
            item.available
              ? "bg-success/15 text-success"
              : "bg-warning/15 text-warning"
          }`}
        >
          {item.available ? "Available" : "Sold out"}
        </button>
        <button
          disabled={busy}
          onClick={onDelete}
          className="text-danger text-xs px-2 py-1 hover:underline disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function AddItemForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (item: MenuItem) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToScaledDataUrl(file);
      await new Promise((r) => setTimeout(r, 700));
      setImageUrl(dataUrl);
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError(null);
    const priceNum = Number(price);
    if (!name.trim()) return setError("Name is required");
    if (!category.trim()) return setError("Category is required");
    if (!Number.isFinite(priceNum) || priceNum < 0)
      return setError("Enter a valid price");

    setSaving(true);
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          price: priceNum,
          description: description.trim(),
          imageUrl,
        }),
      });
      const data = await res.json();
      if (res.ok) onCreated(data as MenuItem);
      else setError((data.error as string) ?? "Failed to add item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <p className="font-semibold">New menu item</p>

      <div className="flex gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-surface-muted group"
          title="Upload picture (simulation)"
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt="preview"
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-muted text-xs text-center px-1">
              {uploading ? "Uploading…" : "Add image"}
            </span>
          )}
          {imageUrl && (
            <span className="absolute inset-0 bg-black/45 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? "Uploading…" : "Change"}
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />

        <div className="flex-1 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full rounded-lg border border-border px-3 py-2 bg-surface text-sm"
          />
          <div className="flex gap-2">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="flex-1 rounded-lg border border-border px-3 py-2 bg-surface text-sm"
            />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="₱ Price"
              type="number"
              min={0}
              className="w-24 rounded-lg border border-border px-3 py-2 bg-surface text-sm"
            />
          </div>
        </div>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded-lg border border-border px-3 py-2 bg-surface text-sm"
      />

      {error && <p className="text-danger text-xs">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving || uploading}
          className="btn-brand flex-1 py-2.5 text-sm disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add item"}
        </button>
        <button onClick={onCancel} className="btn-ghost px-4 py-2.5 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── QR manager ───────────────────────────────────────────────────────────────

function QrManager({ tables }: { tables: Table[] }) {
  const [selected, setSelected] = useState<Table>(tables[0]);

  if (!selected) return <p className="text-muted">No tables configured.</p>;

  const qrSrc = `/api/qr/${selected.id}`;

  return (
    <div className="grid md:grid-cols-[1fr_auto] gap-6">
      {/* Table picker */}
      <div>
        <p className="text-muted text-sm mb-2">
          Select a table to preview &amp; download its printable QR code.
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {tables.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={`chip text-xs justify-center ${
                selected.id === t.id ? "chip-active" : "chip-idle"
              }`}
            >
              {t.label.replace("Table ", "")}
            </button>
          ))}
        </div>
      </div>

      {/* QR preview */}
      <div className="card p-5 flex flex-col items-center self-start">
        <p className="font-bold mb-3">{selected.label}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrSrc}
          alt={`QR code for ${selected.label}`}
          width={220}
          height={220}
          className="rounded-2xl border border-border"
        />
        <p className="text-muted text-xs mt-3 break-all text-center max-w-[220px]">
          /t/{selected.id}
        </p>
        <a
          href={qrSrc}
          download={`${selected.id}-qr.png`}
          className="btn-brand mt-4 text-sm py-2.5"
        >
          Download PNG
        </a>
      </div>
    </div>
  );
}
