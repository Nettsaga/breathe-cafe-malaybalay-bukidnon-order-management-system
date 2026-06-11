// Small shared formatting helpers.

export function peso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

export function shortTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
