"use client";

import { useChaos } from "@/lib/ChaosContext";
import { raceEvents } from "@/lib/mock-data";
import { formatSessionTime } from "@/lib/format";
import type { RaceEvent } from "@/lib/types";

const EVENT_STYLES: Record<
  RaceEvent["type"],
  { color: string; icon: string }
> = {
  pit: { color: "#f97316", icon: "⏱" },
  overtake: { color: "#22d3ee", icon: "⚡" },
  incident: { color: "#ef4444", icon: "⚠" },
  weather: { color: "#3b82f6", icon: "🌧" },
  strategy: { color: "#a855f7", icon: "📊" },
  flag: { color: "#eab308", icon: "🏴" },
};

const CHAOS_TO_TYPE: Record<string, RaceEvent["type"]> = {
  rain: "weather",
  heatwave: "weather",
  minor_crash: "incident",
  major_crash: "incident",
  tyre_failure: "incident",
  traffic: "flag",
  penalty_5s: "flag",
  tyre_deg: "strategy",
};

export default function RaceHistory({ currentLap = 1 }: { currentLap?: number }) {
  const chaos = useChaos();

  // Merge chaos events into the race feed (excluding routine strategy updates)
  const chaosEvents: RaceEvent[] = chaos.eventHistory
    .filter(e => e.event !== "strategy_update")
    .map((e) => ({
      id: e.id,
      LapNumber: currentLap,
      Time: e.timestamp / 1000,
      type: CHAOS_TO_TYPE[e.event] ?? "incident",
      description: `${e.event.toUpperCase().replace("_", " ")} — ${e.recommendation}`,
    }));

  const allEvents = [...chaosEvents, ...raceEvents];

  return (
    <div className="apex-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="apex-label">RACE FEED</span>
        <span className="apex-label text-gray-600">
          {allEvents.length} EVENTS
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {allEvents.map((event) => {
          const style = EVENT_STYLES[event.type];
          return (
            <div
              key={event.id}
              className="flex gap-2 py-1.5 border-b border-gray-800/30 last:border-0"
            >
              <div className="flex flex-col items-center pt-0.5">
                <div
                  className="w-5 h-5 flex items-center justify-center text-[10px]"
                  style={{
                    backgroundColor: style.color + "15",
                    border: `1px solid ${style.color}33`,
                  }}
                >
                  {style.icon}
                </div>
                <div
                  className="w-px flex-1 mt-1"
                  style={{ backgroundColor: style.color + "22" }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[10px] text-gray-600">
                    L{event.LapNumber}
                  </span>
                  <span
                    className="text-[8px] font-bold uppercase px-1"
                    style={{
                      color: style.color,
                      backgroundColor: style.color + "11",
                    }}
                  >
                    {event.type}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  {event.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
