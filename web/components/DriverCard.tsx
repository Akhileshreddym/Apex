"use client";

import { mockTimingData, TIRE_COLORS } from "@/lib/mock-data";
import { formatLapTime, formatSectorTime } from "@/lib/format";

export default function DriverCard() {
  const d = mockTimingData[0];
  const tireColor = TIRE_COLORS[d.Compound] ?? "#64748b";

  return (
    <div className="apex-card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="apex-label">DRIVER FOCUS</span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5"
          style={{ backgroundColor: `#${d.TeamColor}22`, color: `#${d.TeamColor}` }}
        >
          P{d.Position}
        </span>
      </div>

      <div className="flex gap-3 items-center">
        <div
          className="w-16 h-16 flex items-center justify-center text-2xl font-black"
          style={{
            background: `linear-gradient(135deg, #${d.TeamColor}33, #${d.TeamColor}11)`,
            borderLeft: `3px solid #${d.TeamColor}`,
          }}
        >
          <span style={{ color: `#${d.TeamColor}` }}>{d.DriverNumber}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-gray-100 truncate">
            {d.FullName}
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">
            {d.TeamName}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div
              className="h-3 px-1.5 flex items-center text-[9px] font-bold uppercase"
              style={{
                backgroundColor: tireColor + "22",
                color: tireColor,
                border: `1px solid ${tireColor}44`,
              }}
            >
              {d.Compound} L{d.TyreLife}
            </div>
            <span className="text-[10px] text-gray-500">
              {d.PitCount} STOP{d.PitCount !== 1 ? "S" : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 mt-1">
        <div>
          <div className="apex-label">LAST</div>
          <div className="apex-value text-xs">
            {formatLapTime(d.LastLapTime)}
          </div>
        </div>
        <div>
          <div className="apex-label">BEST</div>
          <div className="apex-value text-xs text-purple-400">
            {formatLapTime(d.BestLapTime)}
          </div>
        </div>
        <div>
          <div className="apex-label">GAP</div>
          <div className="apex-value text-xs text-apex-cyan">
            {d.GapToLeader}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <div>
          <div className="apex-label">S1</div>
          <div className="font-mono text-[11px] text-apex-green">
            {formatSectorTime(d.Sector1Time)}
          </div>
        </div>
        <div>
          <div className="apex-label">S2</div>
          <div className="font-mono text-[11px] text-yellow-400">
            {formatSectorTime(d.Sector2Time)}
          </div>
        </div>
        <div>
          <div className="apex-label">S3</div>
          <div className="font-mono text-[11px] text-apex-green">
            {formatSectorTime(d.Sector3Time)}
          </div>
        </div>
      </div>
    </div>
  );
}
