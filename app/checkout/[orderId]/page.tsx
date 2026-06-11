import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db";
import QrPayment from "@/components/QrPayment";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrder(orderId);

  if (!order) notFound();

  return <QrPayment order={order} />;
}
