"use client";

import { mockTimingData, TIRE_COLORS } from "@/lib/mock-data";
import { formatLapTime } from "@/lib/format";

export default function CarTimings() {
  return (
    <div className="apex-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="apex-label">LIVE TIMING</span>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-apex-cyan animate-pulse-glow" />
          <span className="apex-label text-apex-cyan">LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-[32px_48px_1fr_64px_64px_72px_72px_40px_40px] gap-0 text-[9px] text-gray-600 uppercase tracking-wider pb-1 border-b border-gray-800 px-1">
        <span>POS</span>
        <span></span>
        <span>DRIVER</span>
        <span className="text-right">GAP</span>
        <span className="text-right">INT</span>
        <span className="text-right">LAST</span>
        <span className="text-right">BEST</span>
        <span className="text-center">TIRE</span>
        <span className="text-center">PIT</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {mockTimingData.map((d) => {
          const tireColor = TIRE_COLORS[d.Compound] ?? "#64748b";
          return (
            <div
              key={d.Abbreviation}
              className={`grid grid-cols-[32px_48px_1fr_64px_64px_72px_72px_40px_40px] gap-0 items-center py-1 px-1 border-b border-gray-800/30 hover:bg-white/[0.02] transition-colors ${
                d.Status === "OUT" ? "opacity-40" : ""
              }`}
            >
              <span
                className="font-mono text-xs font-bold text-center"
                style={{
                  color:
                    d.Position <= 3
                      ? d.Position === 1
                        ? "#22d3ee"
                        : d.Position === 2
                        ? "#e2e8f0"
                        : "#f97316"
                      : "#64748b",
                }}
              >
                {d.Position}
              </span>

              <div className="flex items-center">
                <div
                  className="w-1 h-4 mr-2"
                  style={{ backgroundColor: `#${d.TeamColor}` }}
                />
                <span className="font-mono text-xs font-bold text-gray-100">
                  {d.Abbreviation}
                </span>
              </div>

              <span className="text-[10px] text-gray-500 truncate">
                {d.FullName}
              </span>

              <span
                className={`font-mono text-[11px] text-right ${
                  d.GapToLeader === "LEADER"
                    ? "text-apex-cyan font-bold"
                    : d.GapToLeader === "DNF"
                    ? "text-apex-red"
                    : "text-gray-300"
                }`}
              >
                {d.GapToLeader}
              </span>

              <span className="font-mono text-[11px] text-right text-gray-400">
                {d.IntervalToAhead}
              </span>

              <span className="font-mono text-[11px] text-right text-gray-300">
                {formatLapTime(d.LastLapTime)}
              </span>

              <span className="font-mono text-[11px] text-right text-purple-400">
                {formatLapTime(d.BestLapTime)}
              </span>

              <div className="flex justify-center">
                <div
                  className="w-3 h-3 flex items-center justify-center"
                  title={`${d.Compound} — TyreLife: ${d.TyreLife} laps`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full border"
                    style={{
                      backgroundColor: tireColor + "33",
                      borderColor: tireColor,
                    }}
                  />
                </div>
                <span className="font-mono text-[9px] text-gray-500 ml-0.5">
                  {d.TyreLife}
                </span>
              </div>

              <span className="font-mono text-[10px] text-center text-gray-500">
                {d.PitCount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
