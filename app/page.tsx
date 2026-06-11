import { redirect } from "next/navigation";

// The customer app is the default experience. In production guests land on
// /t/[tableId] from their table's QR code; for the demo we send "/" straight
// to a sample table so the app opens on the customer view.
export default function Home() {
  redirect("/t/table-7");
}
