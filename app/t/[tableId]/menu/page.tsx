import { notFound } from "next/navigation";
import { getMenu, getPromos, getTable } from "@/lib/db";
import MenuBrowser from "@/components/MenuBrowser";

export const dynamic = "force-dynamic";

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ tableId: string }>;
  searchParams: Promise<{ q?: string; c?: string }>;
}) {
  const { tableId } = await params;
  const { q, c } = await searchParams;
  const [table, menu, promos] = await Promise.all([
    getTable(tableId),
    getMenu(),
    getPromos(),
  ]);

  if (!table) notFound();

  return (
    <MenuBrowser
      table={table}
      menu={menu}
      promo={promos[1] ?? promos[0] ?? null}
      initialCategory={c ?? null}
      searchFocused={q !== undefined}
    />
  );
}
