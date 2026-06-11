import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db";
import OrderStatusView from "@/components/OrderStatusView";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrder(orderId);

  if (!order) notFound();

  return <OrderStatusView initial={order} />;
}
