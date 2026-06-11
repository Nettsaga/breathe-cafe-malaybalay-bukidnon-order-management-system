import { getMenu, getOrders, getTables } from "@/lib/db";
import AdminView from "@/components/AdminView";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [menu, tables, orders] = await Promise.all([
    getMenu(),
    getTables(),
    getOrders(),
  ]);
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <AdminView initialMenu={menu} tables={tables} initialOrders={orders} />;
}
