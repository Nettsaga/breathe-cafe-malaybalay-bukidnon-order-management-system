"use client";

import { peso, shortTime } from "@/lib/format";
import type { Order } from "@/lib/types";

// 80mm thermal-style ticket. Hidden on screen; only this element is visible
// during window.print() (see the @media print rules in globals.css).
export default function KitchenTicket({ order }: { order: Order }) {
  return (
    <div className="print-ticket hidden print:block font-mono text-black">
      <div className="text-center mb-2">
        <p className="text-lg font-bold">BREATHE CAFE</p>
        <p className="text-xs">Malaybalay, Bukidnon</p>
        <p className="text-xs">— Kitchen Order —</p>
      </div>

      <div className="text-sm border-t border-b border-black border-dashed py-1 my-1">
        <div className="flex justify-between">
          <span>{order.tableLabel}</span>
          <span>{shortTime(order.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Order</span>
          <span>{order.id}</span>
        </div>
      </div>

      <table className="w-full text-sm my-2">
        <tbody>
          {order.items.map((it, i) => (
            <tr key={`${it.menuItemId}-${i}`} className="align-top">
              <td className="pr-2 font-bold">{it.qty}×</td>
              <td className="w-full">
                {it.name}
                {it.optionsLabel ? (
                  <div className="text-xs">{it.optionsLabel}</div>
                ) : null}
                {it.notes ? (
                  <div className="text-xs italic">↳ {it.notes}</div>
                ) : null}
              </td>
              <td className="text-right whitespace-nowrap">
                {peso(it.price * it.qty)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black border-dashed pt-1 text-sm flex justify-between font-bold">
        <span>TOTAL</span>
        <span>{peso(order.total)}</span>
      </div>
      <p className="text-center text-xs mt-2">Paid via GCash · QR Ph</p>
      <p className="text-center text-xs">Ref: {order.paymentRef ?? "—"}</p>
    </div>
  );
}
