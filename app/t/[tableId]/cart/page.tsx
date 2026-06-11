import { notFound } from "next/navigation";
import { getTable } from "@/lib/db";
import CartView from "@/components/CartView";

export const dynamic = "force-dynamic";

export default async function CartPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  const table = await getTable(tableId);
  if (!table) notFound();

  return <CartView table={table} />;
}
