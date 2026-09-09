"use client";

import type { RaceEvent } from "@/lib/types";

const EVENT_STYLES: Record<RaceEvent["type"], { color: string; icon: string }> = {
  pit: { color: "#cca877", icon: "P" },
  overtake: { color: "#8bb6e6", icon: "↑" },
  incident: { color: "#bd8882", icon: "!" },
  weather: { color: "#91abc8", icon: "W" },
  strategy: { color: "#b8a1d3", icon: "S" },
  flag: { color: "#b7ad91", icon: "F" },
};

export default function RaceHistory({ currentLap = 1, raceEvents = [] }: { currentLap?: number; raceEvents?: RaceEvent[] }) {
  return (
    <section className="apex-card flex h-full min-h-0 flex-col overflow-hidden" style={{ padding: 0, borderRadius: 6 }}>
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-3 py-2.5">
        <div className="flex items-center gap-2">

          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-200">Race control</h2>
        </div>
        <span className="font-mono text-[8px] text-gray-500">{String(raceEvents.length).padStart(2, "0")} EVENTS</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3">
        {raceEvents.length === 0 ? (
          <div className="flex h-full flex-col justify-center py-4">
            <span className="mb-2 font-mono text-[8px] uppercase tracking-[0.16em] text-gray-500">Lap {String(currentLap).padStart(2, "0")} / Event log</span>
            <p className="text-xs font-medium text-gray-300">Awaiting first event</p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-gray-500">Pit stops, overtakes and race incidents appear here as the session progresses.</p>
          </div>
        ) : raceEvents.map((event) => {
          const style = EVENT_STYLES[event.type] ?? EVENT_STYLES.flag;
          return (
            <article key={event.id} className="flex gap-2.5 border-b border-white/[0.05] py-2.5 last:border-0">
              <div className="flex w-6 shrink-0 flex-col items-center gap-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-sm border font-mono text-[10px] font-bold" style={{ color: style.color, backgroundColor: style.color + "10", borderColor: style.color + "30" }}>{style.icon}</span>
                <span className="font-mono text-[8px] text-gray-500">L{event.LapNumber}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 font-mono text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: style.color }}>{event.type}</div>
                <p className="text-[10px] leading-[1.6] text-gray-400">{event.description}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
