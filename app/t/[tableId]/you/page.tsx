import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Coffee,
  Flame,
  CupSoda,
  TrendingUp,
  Users,
  ChevronRight,
} from "lucide-react";
import { getMenu, getOrders, getTable } from "@/lib/db";
import { buildTableHub, type FactIcon } from "@/lib/funhub";
import { peso, shortTime } from "@/lib/format";
import BottomNav from "@/components/BottomNav";

export const dynamic = "force-dynamic";

const FACT_ICON: Record<FactIcon, typeof Coffee> = {
  coffee: Coffee,
  flame: Flame,
  cup: CupSoda,
  trending: TrendingUp,
  users: Users,
};

export default async function TableHubPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  const [table, menu, orders] = await Promise.all([
    getTable(tableId),
    getMenu(),
    getOrders(),
  ]);
  if (!table) notFound();

  const hub = buildTableHub(table.id, table.label, menu, orders);

  return (
    <div className="flex-1 flex flex-col bg-background lg:pl-24 xl:pl-28">
      {/* Greeting — soft brand-light band on mobile, clean white on desktop */}
      <header className="bg-brand-light lg:bg-transparent px-5 lg:px-8 pt-8 lg:pt-10 pb-5 lg:pb-1">
        <div className="kiosk-container px-0">
          <h1 className="text-2xl lg:text-4xl font-semibold leading-tight text-foreground">
            Good to see you :&gt;
          </h1>
          <p className="text-muted text-sm mt-1">
            You&apos;re at{" "}
            <span className="font-semibold text-brand">{table.label}</span> · Breathe
            Cafe
          </p>
        </div>
      </header>

      <main className="flex-1 kiosk-container px-5 lg:px-8 py-5 lg:py-8 pb-28">
        {/* Ranking + daily grind — side by side on desktop */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        {/* Brew-crew ranking */}
        <div className="card p-5 mb-6 lg:mb-0 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center shrink-0">
            <Coffee className="w-7 h-7 text-brand" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="text-muted text-xs uppercase tracking-wide">
              today&apos;s lineup
            </p>
            <p className="text-lg font-semibold leading-tight">
              You&apos;re <span className="text-brand">{hub.rankLabel}</span>.
              Welcome to the rush.
            </p>
          </div>
        </div>

        {/* Fun stats */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-series" />
            <h2 className="text-[15px] lg:text-lg font-semibold">the daily grind</h2>
          </div>
          <div className="space-y-2.5 mb-7 lg:mb-0">
            {hub.funFacts.map((f, i) => {
              const Icon = FACT_ICON[f.icon];
              return (
                <div
                  key={i}
                  className="bg-surface-muted/60 rounded-2xl px-4 py-3 flex items-center gap-3"
                >
                  <span className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0">
                    <Icon className="w-[18px] h-[18px] text-brand" strokeWidth={1.8} />
                  </span>
                  <p className="text-sm text-foreground/90">{f.text}</p>
                </div>
              );
            })}
          </div>
        </div>
        </div>
        {/* end ranking + daily grind grid */}

        <div className="mt-7">
        {/* Don't know what to order? → the usual */}
        {hub.usualItem && (
          <section className="mb-7">
            <h2 className="text-[15px] font-semibold">Don&apos;t know what to order?</h2>
            <p className="text-muted text-sm mb-3">
              Go for the usual of the {table.label} squad.
            </p>
            <Link
              href={`/t/${table.id}/item/${hub.usualItem.id}`}
              className="card p-3 flex items-center gap-4 active:scale-[0.99] transition-transform"
            >
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <div className="absolute inset-0 halo" />
                {hub.usualItem.imageUrl && (
                  <div className="relative w-[88%] aspect-square rounded-full overflow-hidden shadow-md">
                    <Image
                      src={hub.usualItem.imageUrl}
                      alt={hub.usualItem.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-series">
                  the usual
                </p>
                <p className="font-semibold leading-tight">{hub.usualItem.name}</p>
                <p className="text-foreground/90 font-medium text-sm mt-0.5">
                  {peso(hub.usualItem.price)}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted shrink-0" />
            </Link>
          </section>
        )}

        {/* Recent orders at this table (if any) */}
        {hub.recent.length > 0 && (
          <section className="mb-7">
            <h2 className="text-[15px] font-semibold mb-3">
              Last spotted at {table.label}
            </h2>
            <div className="space-y-2">
              {hub.recent.map((o) => (
                <Link
                  key={o.id}
                  href={`/order/${o.id}`}
                  className="card px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {o.items.map((it) => `${it.qty}× ${it.name}`).join(", ")}
                    </p>
                    <p className="text-muted text-xs">
                      {shortTime(o.createdAt)} · {o.id}
                    </p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">
                    {peso(o.total)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Branch out */}
        {hub.popular.length > 0 && (
          <>
            <h2 className="text-[15px] lg:text-lg font-semibold mb-3">
              the {table.label} squad also swears by these
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6 lg:gap-y-10">
              {hub.popular.map((item) => (
                <Link
                  key={item.id}
                  href={`/t/${table.id}/item/${item.id}`}
                  className="flex flex-col items-center text-center active:scale-95 transition-transform"
                >
                  <div className="relative w-full aspect-square flex items-center justify-center mb-1">
                    <div className="absolute inset-0 halo" />
                    {item.imageUrl && (
                      <div className="relative w-[82%] aspect-square rounded-full overflow-hidden shadow-md">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                  {item.seriesLabel && (
                    <p className="series-label">{item.seriesLabel}</p>
                  )}
                  <p className="font-semibold text-sm leading-snug line-clamp-1">
                    {item.name}
                  </p>
                  <p className="text-foreground/90 font-medium text-sm mt-0.5">
                    {peso(item.price)}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}

        <Link
          href={`/t/${table.id}/menu`}
          className="btn-brand w-full mt-7 flex items-center justify-center gap-1"
        >
          Browse full menu <ChevronRight className="w-4 h-4" />
        </Link>
        </div>
        {/* end content wrapper */}
      </main>

      <BottomNav tableId={table.id} />
    </div>
  );
}
