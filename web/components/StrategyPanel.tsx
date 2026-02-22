"use client";

import { useChaos } from "@/lib/ChaosContext";
import { mockStrategies, TIRE_COLORS } from "@/lib/mock-data";
import type { StrategyRec } from "@/lib/types";
import { useState, useEffect, useRef } from "react";

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

export default function StrategyPanel({ currentLap = 1, playbackSpeed = 1 }: { currentLap?: number, playbackSpeed?: number }) {
  const chaos = useChaos();
  const [strategies, setStrategies] = useState<StrategyRec[]>([]);
  const lastProcessedMathRef = useRef<any>(null);

  useEffect(() => {
    if (!chaos.mathResults || !chaos.event) return;

    const math = chaos.mathResults;

    let priority: "critical" | "high" | "medium" | "low" = "medium";
    if (["major_crash", "tyre_failure", "rain"].includes(chaos.event)) {
      priority = "critical";
    } else if (["minor_crash", "heatwave", "tyre_deg"].includes(chaos.event)) {
      priority = "high";
    }

    // For chaos events (critical/high), only process once per unique mathResults object.
    // This prevents the same "MAJOR CRASH" from re-spawning on every lap tick.
    if (priority !== "medium" && math === lastProcessedMathRef.current) {
      return;
    }
    if (priority !== "medium") {
      lastProcessedMathRef.current = math;
    }

    let compound: any = "INTERMEDIATE";
    const recommendation = math.recommendation || "";

    if (recommendation.includes("Hards")) compound = "HARD";
    else if (recommendation.includes("slicks")) compound = "SOFT";
    else if (["tyre_deg", "traffic", "penalty_5s"].includes(chaos.event)) {
      compound = "MEDIUM";
    }

    // THROTTLE UI UPDATES
    // Critical/High events and Lap 1 always bypass the throttle
    if (priority === "medium" && currentLap !== 1) {
      if (playbackSpeed === 1) {
        if (currentLap % 3 !== 0 && currentLap !== 53) return; // 1x: Update every 3 laps
      } else if (playbackSpeed === 5000) {
        if (currentLap !== 53) return; // 5000x: Only update at end of race
      } else {
        if (currentLap % 5 !== 0 && currentLap !== 53) return; // 2x-50x: Update every 5 laps
      }
    }

    const newStrategy: StrategyRec = {
      id: Math.random().toString(),
      LapNumber: currentLap,
      priority,
      action: chaos.event.toUpperCase().replace("_", " "),
      Compound: compound,
      winProb: math.win_probability || 0,
      detail: recommendation || "Analyzing impact...",
    };

    setStrategies((prev) => {
      // Prevent duplicates of the same event/lap from backend polling
      if (prev.length > 0 && prev[0].LapNumber === currentLap && prev[0].action === newStrategy.action) {
        return prev;
      }
      return [newStrategy, ...prev];
    });
  }, [chaos.mathResults, chaos.event, currentLap, playbackSpeed]);

  return (
    <div className="apex-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="apex-label">STRATEGY</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 ${chaos.connected
          ? 'text-apex-cyan bg-apex-cyan/10 animate-pulse'
          : 'text-gray-600 bg-gray-800'
          }`}>
          {chaos.connected ? 'WS:LIVE' : 'STATIC'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {strategies.map((s) => {
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
