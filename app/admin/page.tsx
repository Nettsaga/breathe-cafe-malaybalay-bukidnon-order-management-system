import { getMenu, getTables } from "@/lib/db";
import AdminView from "@/components/AdminView";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [menu, tables] = await Promise.all([getMenu(), getTables()]);
  return <AdminView initialMenu={menu} tables={tables} />;
}
