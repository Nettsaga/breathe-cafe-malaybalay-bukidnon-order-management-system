"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { House, CupSoda, ShoppingBag, Armchair, Coffee } from "lucide-react";
import { useCart } from "@/lib/store";

// Persistent bottom navigation for the customer screens, scoped to the table.
// "Rewards" is shown disabled (coming soon) to match the reference app's nav.
export default function BottomNav({ tableId }: { tableId: string }) {
  const pathname = usePathname();
  const count = useCart((s) => s.count());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const base = `/t/${tableId}`;
  const tabs = [
    { href: base, label: "Home", Icon: House, match: (p: string) => p === base },
    {
      href: `${base}/menu`,
      label: "Menu",
      Icon: CupSoda,
      match: (p: string) =>
        p.startsWith(`${base}/menu`) || p.startsWith(`${base}/item`),
    },
    {
      href: `${base}/cart`,
      label: "My Order",
      Icon: ShoppingBag,
      match: (p: string) => p.startsWith(`${base}/cart`),
      badge: true,
    },
    {
      href: `${base}/you`,
      label: "Table",
      Icon: Armchair,
      match: (p: string) => p.startsWith(`${base}/you`),
    },
  ];

  return (
    <>
      {/* Mobile: bottom tab bar (unchanged). Hidden on desktop. */}
      <nav className="lg:hidden no-print sticky bottom-0 z-30 bg-surface/95 backdrop-blur border-t border-border">
        <div className="max-w-md mx-auto grid grid-cols-4">
          {tabs.map(({ href, label, Icon, match, badge }) => {
            const active = match(pathname);
            return (
              <Link
                key={label}
                href={href}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 1.8} />
                {label}
                {badge && mounted && count > 0 && (
                  <span className="absolute top-1 right-[24%] bg-accent text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop: fixed left sidebar rail — the kiosk nav frame. Hidden on mobile. */}
      <nav className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-24 xl:w-28 z-40 bg-surface border-r border-border no-print py-6 px-2">
        <Link
          href={base}
          className="flex flex-col items-center gap-1 pb-5 mb-3 border-b border-border"
        >
          <span className="w-11 h-11 rounded-2xl bg-brand text-white flex items-center justify-center">
            <Coffee className="w-6 h-6" strokeWidth={1.8} />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand">
            Breathe
          </span>
        </Link>

        {/* Tabs stacked directly below the brand */}
        <div className="flex flex-col gap-3">
          {tabs.map(({ href, label, Icon, match, badge }) => {
            const active = match(pathname);
            return (
              <Link
                key={label}
                href={href}
                className={`relative w-full flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl text-xs font-semibold text-center leading-tight transition-all ${
                  active
                    ? "text-brand bg-brand-light"
                    : "text-muted hover:text-foreground hover:bg-surface-muted"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-brand" />
                )}
                <span className="relative">
                  <Icon className="w-7 h-7" strokeWidth={active ? 2.4 : 1.8} />
                  {badge && mounted && count > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-accent text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
