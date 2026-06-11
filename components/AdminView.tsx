"use client";

import { useState } from "react";
import Image from "next/image";
import { peso } from "@/lib/format";
import type { MenuItem, Table } from "@/lib/types";

type Tab = "menu" | "qr";

export default function AdminView({
  initialMenu,
  tables,
}: {
  initialMenu: MenuItem[];
  tables: Table[];
}) {
  const [tab, setTab] = useState<Tab>("menu");

  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="bg-surface border-b border-border px-6 py-4">
        <h1 className="text-xl font-black text-brand">Breathe Admin</h1>
        <p className="text-muted text-sm">Menu &amp; table QR codes</p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setTab("menu")}
            className={`chip ${tab === "menu" ? "chip-active" : "chip-idle"}`}
          >
            Menu
          </button>
          <button
            onClick={() => setTab("qr")}
            className={`chip ${tab === "qr" ? "chip-active" : "chip-idle"}`}
          >
            Table QR codes
          </button>
        </div>
      </header>

      <main className="flex-1 p-5 max-w-3xl mx-auto w-full">
        {tab === "menu" ? (
          <MenuManager initialMenu={initialMenu} />
        ) : (
          <QrManager tables={tables} />
        )}
      </main>
    </div>
  );
}

function MenuManager({ initialMenu }: { initialMenu: MenuItem[] }) {
  const [menu, setMenu] = useState(initialMenu);
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(id: string, body: Partial<Pick<MenuItem, "available" | "price">>) {
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

  return (
    <div className="space-y-3">
      {menu.map((item) => (
        <div key={item.id} className="card p-3 flex items-center gap-3">
          {item.imageUrl && (
            <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-surface-muted">
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
          )}
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
                if (v !== item.price) patch(item.id, { price: v });
              }}
            />
          </label>

          {/* Availability toggle */}
          <button
            disabled={busy === item.id}
            onClick={() => patch(item.id, { available: !item.available })}
            className={`chip text-xs ${
              item.available ? "bg-success/15 text-success" : "bg-danger/10 text-danger"
            }`}
          >
            {item.available ? "Available" : "Sold out"}
          </button>
        </div>
      ))}
    </div>
  );
}

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
