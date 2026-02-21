"use client";

import { mockTimingData, TIRE_COLORS } from "@/lib/mock-data";
import { formatLapTime, formatSectorTime } from "@/lib/format";

export default function DriverCard() {
  const d = mockTimingData[0];
  const tireColor = TIRE_COLORS[d.Compound] ?? "#64748b";

  return (
    <div className="apex-card flex flex-col h-full overflow-hidden relative">
      {/* Header badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="apex-label">DRIVER FOCUS</span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5"
          style={{ backgroundColor: `#${d.TeamColor}22`, color: `#${d.TeamColor}` }}
        >
          P{d.Position}
        </span>
      </div>

      {/* Driver Photo + Info (Image 2 inspired) */}
      <div className="flex gap-3 items-start">
        {/* Driver Photo */}
        <div
          className="w-24 h-28 shrink-0 overflow-hidden relative"
          style={{
            borderLeft: `3px solid #${d.TeamColor}`,
            background: `linear-gradient(135deg, #${d.TeamColor}22, #0a0f1a)`,
          }}
        >
          <img
            src="/driver_ver.png"
            alt={d.FullName}
            className="w-full h-full object-cover object-top"
          />
          {/* Gradient overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-8"
            style={{ background: 'linear-gradient(transparent, #0a0f1a)' }}
          />
        </div>

        {/* Name + Team + Live Stats */}
        <div className="flex-1 min-w-0 flex flex-col justify-between" style={{ minHeight: 112 }}>
          <div>
            <div
              className="text-lg font-black tracking-wide text-gray-100 uppercase truncate"
              style={{ lineHeight: 1.1 }}
            >
              {d.FullName.split(' ')[0]}
            </div>
            <div
              className="text-2xl font-black tracking-tight uppercase truncate"
              style={{ color: `#${d.TeamColor}`, lineHeight: 1 }}
            >
              {d.FullName.split(' ').slice(1).join(' ')}
            </div>
            <div className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">
              {d.TeamName}
            </div>
          </div>

          {/* Tire & Stint Badge */}
          <div className="flex items-center gap-2 mt-2">
            <div
              className="h-5 px-2 flex items-center text-[10px] font-bold uppercase"
              style={{
                backgroundColor: tireColor + "22",
                color: tireColor,
                border: `1px solid ${tireColor}44`,
              }}
            >
              {d.Compound} — L{d.TyreLife}
            </div>
            <span className="text-[10px] text-gray-500">
              {d.PitCount} STOP{d.PitCount !== 1 ? "S" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Sector Times */}
      <div className="grid grid-cols-3 gap-1 mt-3 pt-2 border-t border-gray-800/60">
        <div>
          <div className="apex-label">S1</div>
          <div className="font-mono text-xs font-bold text-apex-green">
            {formatSectorTime(d.Sector1Time)}
          </div>
        </div>
        <div>
          <div className="apex-label">S2</div>
          <div className="font-mono text-xs font-bold text-yellow-400">
            {formatSectorTime(d.Sector2Time)}
          </div>
        </div>
        <div>
          <div className="apex-label">S3</div>
          <div className="font-mono text-xs font-bold text-apex-green">
            {formatSectorTime(d.Sector3Time)}
          </div>
        </div>
      </div>

      {/* Lap Times */}
      <div className="grid grid-cols-3 gap-1 mt-1">
        <div>
          <div className="apex-label">LAST</div>
          <div className="font-mono text-sm font-bold text-gray-100">
            {formatLapTime(d.LastLapTime)}
          </div>
        </div>
        <div>
          <div className="apex-label">BEST</div>
          <div className="font-mono text-sm font-bold text-purple-400">
            {formatLapTime(d.BestLapTime)}
          </div>
        </div>
        <div>
          <div className="apex-label">GAP</div>
          <div className="font-mono text-sm font-bold text-apex-cyan">
            {d.GapToLeader}
          </div>
        </div>
      </div>
    </div>
  );
}
