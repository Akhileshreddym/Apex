"use client";

import { useChaos } from "@/lib/ChaosContext";
import { mockPitWindow } from "@/lib/mock-data";

interface PitWindowProps {
  currentLap: number;
}

export default function PitWindow({ currentLap }: PitWindowProps) {
  const chaos = useChaos();
  const pit = { ...mockPitWindow, CurrentLap: currentLap };

  let windowStart = 33;
  let windowEnd = 38;

  // Plan B / Plan C logic: If we completely miss the window, recalculate for a later stint
  if (currentLap > windowEnd) {
    if (currentLap <= 47) {
      windowStart = 43;
      windowEnd = 47;
    } else {
      windowStart = 50;
      windowEnd = 52;
    }
  }

  let undercutLap = windowStart;
  let undercutDelta = -0.8;
  let overcutLap = windowEnd - 1;
  let overcutDelta = 0.3;

  // Shift optimal window dynamically based on events
  if (chaos.event === "rain" || chaos.event === "major_crash" || chaos.event === "tyre_failure") {
    windowStart = currentLap;
    windowEnd = Math.min(currentLap + 2, pit.TotalLaps);
    undercutLap = currentLap;
    undercutDelta = -1.5;
  } else if (chaos.event === "tyre_deg" || chaos.event === "heatwave") {
    windowStart = currentLap + 1;
    windowEnd = Math.min(windowStart + 3, pit.TotalLaps);
    undercutLap = windowStart;
    undercutDelta = -1.0;
  } else if (chaos.event === "traffic") {
    undercutDelta = -1.8;
  }

  pit.OptimalWindow = [windowStart, windowEnd];
  pit.UndercutLap = undercutLap;
  pit.UndercutDelta = undercutDelta;
  pit.OvercutLap = overcutLap;
  pit.OvercutDelta = overcutDelta;

  const inWindow = pit.CurrentLap >= windowStart && pit.CurrentLap <= windowEnd;
  const urgentEvent = ["rain", "major_crash", "tyre_failure"].includes(chaos.event);

  return (
    <div className="apex-card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="apex-label">PIT WINDOW</span>
        {(inWindow || urgentEvent) && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 animate-pulse-glow ${urgentEvent
            ? 'text-apex-red bg-apex-red/10'
            : 'text-apex-orange bg-apex-orange/10'
            }`}>
            {urgentEvent ? 'BOX NOW' : 'WINDOW OPEN'}
          </span>
        )}
      </div>

      <div className="relative h-2 bg-gray-800 overflow-hidden">
        <div
          className="absolute inset-y-0 border-l border-r"
          style={{
            left: `${(windowStart / pit.TotalLaps) * 100}%`,
            width: `${((windowEnd - windowStart) / pit.TotalLaps) * 100}%`,
            backgroundColor: urgentEvent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)',
            borderColor: urgentEvent ? 'rgba(239, 68, 68, 0.4)' : 'rgba(249, 115, 22, 0.4)',
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
        <span className={urgentEvent ? 'text-apex-red font-bold' : 'text-apex-orange'}>
          {urgentEvent ? `⚠ BOX L${windowStart}` : `OPTIMAL L${windowStart}-L${windowEnd}`}
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

      {/* Time penalty indicator */}
      {chaos.timePenalty > 0 && (
        <div className="flex items-center justify-between border-t border-gray-800/60 pt-1">
          <span className="apex-label text-apex-red">PENALTY</span>
          <span className="font-mono text-[11px] font-bold text-apex-red">+{chaos.timePenalty}s</span>
        </div>
      )}
    </div>
  );
}
