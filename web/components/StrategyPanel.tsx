"use client";

import { mockStrategies, TIRE_COLORS } from "@/lib/mock-data";
import type { StrategyRec } from "@/lib/types";

const PRIORITY_STYLES: Record<
  StrategyRec["priority"],
  { border: string; bg: string; text: string; label: string }
> = {
  critical: {
    border: "border-apex-red",
    bg: "bg-red-500/5",
    text: "text-apex-red",
    label: "CRITICAL",
  },
  high: {
    border: "border-apex-orange",
    bg: "bg-orange-500/5",
    text: "text-apex-orange",
    label: "HIGH",
  },
  medium: {
    border: "border-apex-cyan",
    bg: "bg-cyan-500/5",
    text: "text-apex-cyan",
    label: "MEDIUM",
  },
  low: {
    border: "border-gray-600",
    bg: "bg-gray-800/50",
    text: "text-gray-400",
    label: "LOW",
  },
};

export default function StrategyPanel() {
  return (
    <div className="apex-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="apex-label">STRATEGY</span>
        <span className="text-[9px] font-bold text-apex-cyan bg-apex-cyan/10 px-1.5 py-0.5">
          MONTE CARLO
        </span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {mockStrategies.map((s) => {
          const style = PRIORITY_STYLES[s.priority];
          const tireColor = TIRE_COLORS[s.Compound] ?? "#64748b";
          return (
            <div
              key={s.id}
              className={`border-l-2 ${style.border} ${style.bg} p-2 transition-all`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold ${style.text}`}>
                    {style.label}
                  </span>
                  <span className="text-[9px] text-gray-600">
                    LAP {s.LapNumber}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-gray-100">
                  {s.winProb}%
                </span>
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <span className={`font-mono text-xs font-bold ${style.text}`}>
                  {s.action}
                </span>
                <div
                  className="h-3 px-1.5 flex items-center text-[8px] font-bold uppercase"
                  style={{
                    backgroundColor: tireColor + "22",
                    color: tireColor,
                    border: `1px solid ${tireColor}44`,
                  }}
                >
                  {s.Compound}
                </div>
              </div>

              <p className="text-[10px] text-gray-500 leading-relaxed">
                {s.detail}
              </p>

              <div className="mt-1.5 h-1 bg-gray-800 overflow-hidden">
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${s.winProb}%`,
                    backgroundColor:
                      s.winProb >= 75
                        ? "#22c55e"
                        : s.winProb >= 50
                        ? "#f97316"
                        : "#ef4444",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
