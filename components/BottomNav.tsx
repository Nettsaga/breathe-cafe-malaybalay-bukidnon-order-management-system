"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { House, CupSoda, ShoppingBag, Gift } from "lucide-react";
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
  ];

  return (
    <nav className="no-print sticky bottom-0 z-30 bg-surface/95 backdrop-blur border-t border-border">
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
        {/* Coming-soon tab */}
        <div className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted/40 cursor-not-allowed">
          <Gift className="w-[22px] h-[22px]" strokeWidth={1.8} />
          Rewards
        </div>
      </div>
    </nav>
  );
}
