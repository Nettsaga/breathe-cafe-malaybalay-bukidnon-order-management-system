import { notFound } from "next/navigation";
import { getMenu, getTable } from "@/lib/db";
import ProductDetail from "@/components/ProductDetail";

export const dynamic = "force-dynamic";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ tableId: string; itemId: string }>;
}) {
  const { tableId, itemId } = await params;
  const [table, menu] = await Promise.all([getTable(tableId), getMenu()]);

  if (!table) notFound();
  const item = menu.find((m) => m.id === itemId);
  if (!item) notFound();

  return <ProductDetail table={table} item={item} />;
}
