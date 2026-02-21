"use client";

import { mockPitWindow } from "@/lib/mock-data";

export default function PitWindow() {
  const pit = mockPitWindow;
  const windowStart = pit.OptimalWindow[0];
  const windowEnd = pit.OptimalWindow[1];
  const inWindow = pit.CurrentLap >= windowStart && pit.CurrentLap <= windowEnd;

  return (
    <div className="apex-card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="apex-label">PIT WINDOW</span>
        {inWindow && (
          <span className="text-[9px] font-bold text-apex-orange bg-apex-orange/10 px-1.5 py-0.5 animate-pulse-glow">
            WINDOW OPEN
          </span>
        )}
      </div>

      <div className="relative h-2 bg-gray-800 overflow-hidden">
        <div
          className="absolute inset-y-0 bg-apex-orange/20 border-l border-r border-apex-orange/40"
          style={{
            left: `${(windowStart / pit.TotalLaps) * 100}%`,
            width: `${((windowEnd - windowStart) / pit.TotalLaps) * 100}%`,
          }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-apex-cyan/40"
          style={{ width: `${(pit.CurrentLap / pit.TotalLaps) * 100}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-white"
          style={{ left: `${(pit.CurrentLap / pit.TotalLaps) * 100}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-gray-500 font-mono">
        <span>L{windowStart}</span>
        <span className="text-apex-orange">
          OPTIMAL L{windowStart}-L{windowEnd}
        </span>
        <span>L{windowEnd}</span>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <div>
          <div className="apex-label">UNDERCUT</div>
          <div className="font-mono text-[11px] text-apex-green">
            L{pit.UndercutLap} {pit.UndercutDelta}s
          </div>
        </div>
        <div>
          <div className="apex-label">OVERCUT</div>
          <div className="font-mono text-[11px] text-apex-orange">
            L{pit.OvercutLap} +{pit.OvercutDelta}s
          </div>
        </div>
        <div>
          <div className="apex-label">PIT LOSS</div>
          <div className="font-mono text-[11px] text-gray-300">
            {pit.PitLossTime}s
          </div>
        </div>
      </div>
    </div>
  );
}
