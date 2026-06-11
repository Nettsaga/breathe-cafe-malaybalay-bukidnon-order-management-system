import Link from "next/link";

// Landing / demo hub. In production customers never see this — they land
// directly on /t/[tableId] from their table's QR code. This page just makes
// the proposal easy to navigate.
export default function Home() {
  const links = [
    {
      href: "/t/table-7",
      title: "Customer App",
      desc: "What a guest sees after scanning Table 7's QR code — home, menu, customize, pay.",
      emoji: "📱",
    },
    {
      href: "/kitchen",
      title: "Kitchen Display",
      desc: "Live order queue for the barista's tablet, with print.",
      emoji: "👨‍🍳",
    },
    {
      href: "/admin",
      title: "Admin",
      desc: "Manage the menu and generate printable table QR codes.",
      emoji: "⚙️",
    },
  ];

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-16 max-w-2xl mx-auto w-full">
      <span className="inline-flex items-center gap-2 chip chip-idle mb-6">
        Malaybalay, Bukidnon
      </span>
      <h1 className="text-5xl font-bold tracking-tight text-center text-brand">
        Breathe Cafe
      </h1>
      <p className="text-muted text-center mt-4 mb-12 text-lg max-w-md">
        Scan-to-order for dine-in guests. Scan, browse, pay with GCash, and
        we&apos;ll start brewing.
      </p>

      <div className="w-full grid gap-4">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="card p-6 flex items-center gap-5 hover:-translate-y-0.5 transition-transform"
          >
            <span className="text-3xl">{l.emoji}</span>
            <span className="flex-1">
              <span className="block font-bold text-lg">{l.title}</span>
              <span className="block text-muted text-sm">{l.desc}</span>
            </span>
            <span className="text-brand text-xl">→</span>
          </Link>
        ))}
      </div>

      <p className="text-muted/70 text-xs mt-12 text-center">
        Proposal demo · payments run on PayMongo test mode
      </p>
    </main>
  );
}
