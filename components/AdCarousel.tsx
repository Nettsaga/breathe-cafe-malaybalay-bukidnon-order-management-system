"use client";

import { useEffect, useRef, useState } from "react";
import { Ticket } from "lucide-react";
import type { Promo } from "@/lib/types";

// Auto-advancing, swipeable promo carousel (CSS scroll-snap + autoplay).
// Pauses while the user is touching/dragging; resumes after.
export default function AdCarousel({ promos }: { promos: Promo[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);

  // Autoplay
  useEffect(() => {
    if (promos.length <= 1) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const track = trackRef.current;
      if (!track) return;
      const next = (active + 1) % promos.length;
      track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
    }, 4000);
    return () => clearInterval(id);
  }, [active, promos.length]);

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  }

  if (promos.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={onScroll}
        onPointerDown={() => (pausedRef.current = true)}
        onPointerUp={() => (pausedRef.current = false)}
        onPointerCancel={() => (pausedRef.current = false)}
        className="flex overflow-x-auto no-scrollbar snap-x-row rounded-3xl"
      >
        {promos.map((p) => (
          <div key={p.id} className="snap-item shrink-0 w-full">
            <div
              className="relative h-44 rounded-3xl overflow-hidden p-5 flex flex-col justify-center text-white"
              style={{
                backgroundImage: `linear-gradient(135deg, ${p.from}, ${p.to})`,
              }}
            >
              <div className="relative z-10 max-w-[72%]">
                <h3 className="text-xl font-black leading-tight">{p.title}</h3>
                <p className="text-white/85 text-sm mt-1">{p.subtitle}</p>
                {p.voucher && (
                  <span className="inline-flex items-center gap-1.5 mt-3 bg-white/20 backdrop-blur rounded-full px-3 py-1 text-xs font-bold">
                    <Ticket className="w-3.5 h-3.5" />
                    {p.voucher}
                  </span>
                )}
              </div>
              <span className="absolute -right-3 -bottom-5 text-[120px] leading-none opacity-25 select-none">
                {p.emoji}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      {promos.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {promos.map((p, i) => (
            <span
              key={p.id}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-5 bg-brand" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
