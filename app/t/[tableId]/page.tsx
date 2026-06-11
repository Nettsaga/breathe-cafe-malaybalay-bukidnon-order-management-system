import { notFound } from "next/navigation";
import { getMenu, getPromos, getTable } from "@/lib/db";
import HomeView from "@/components/HomeView";

export const dynamic = "force-dynamic";

// Customer landing after scanning the table QR — the cozy Home screen.
export default async function TableHomePage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  const [table, menu, promos] = await Promise.all([
    getTable(tableId),
    getMenu(),
    getPromos(),
  ]);

  if (!table) notFound();

  const featured = menu.filter((m) => m.featured && m.available);
  const categories = Array.from(new Set(menu.map((m) => m.category)));

  return (
    <HomeView
      table={table}
      featured={featured}
      promos={promos}
      categories={categories}
    />
  );
}
