"use client";

import { instrumentColor } from "@/lib/display-colors";

import { useChaos } from "@/lib/ChaosContext";
import { TIRE_COLORS } from "@/lib/mock-data";
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
    <section className="apex-card flex h-full min-h-0 flex-col overflow-hidden" style={{ padding: 0, borderRadius: 6 }}>
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-3 py-2.5">
        <div className="flex items-center gap-2">

          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-200">Strategy desk</h2>
        </div>
        <span className={`flex items-center gap-1.5 font-mono text-[8px] tracking-wider ${chaos.connected ? "text-[#87b9a3]" : "text-gray-500"}`}>
          <span className={`h-1 w-1 rounded-full ${chaos.connected ? "bg-[#87b9a3]" : "bg-gray-500"}`} />
          {chaos.connected ? "ONLINE" : "OFFLINE"}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2.5">
        {strategies.length === 0 && (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-2 py-3">
            <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.18em] text-[#87b9a3]">{chaos.connected ? "Awaiting race data" : "Engine disconnected"}</p>
            <h3 className="text-sm font-semibold text-gray-200">{chaos.connected ? "Monitoring the race" : "Strategy on standby"}</h3>
            <p className="mt-2 max-w-[230px] text-[10px] leading-relaxed text-gray-500">{chaos.connected ? "Race conditions and incidents will generate recommendations here." : "Connect the strategy engine to receive pit calls and compound recommendations."}</p>
          </div>
        )}
        {strategies.map((s, index) => {
          const style = PRIORITY_STYLES[s.priority];
          const tireColor = instrumentColor(TIRE_COLORS[s.Compound] ?? "#64748b");
          return (
            <article key={s.id} className={`shrink-0 rounded border border-white/[0.06] border-l-2 ${style.border} ${index === 0 ? style.bg : "bg-white/[0.015]"} p-2.5`}>
              <div className="mb-2 flex items-center justify-between font-mono text-[8px]">
                <span className={`font-bold tracking-wider ${style.text}`}>{index === 0 ? "LATEST / " : ""}{style.label}</span>
                <span className="text-gray-500">LAP {String(s.LapNumber).padStart(2, "0")}</span>
              </div>
              <h3 className="text-[12px] font-bold tracking-wide text-gray-100">{s.action}</h3>
              <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">{s.detail}</p>
              <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.06] pt-2">
                <span className="flex items-center gap-1.5 font-mono text-[8px] font-semibold" style={{ color: tireColor }}>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 text-[7px]" style={{ borderColor: tireColor }}>{s.Compound.charAt(0)}</span>
                  {s.Compound}
                </span>
                <div className="flex items-baseline gap-1.5"><span className="text-[7px] uppercase tracking-wider text-gray-500">Win prob.</span><span className="font-mono text-[13px] font-semibold text-gray-100">{s.winProb}%</span></div>
              </div>
              <div className="mt-2 h-0.5 overflow-hidden bg-white/[0.06]">
                <div className="h-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, s.winProb))}%`, backgroundColor: s.winProb >= 75 ? "#87b9a3" : s.winProb >= 50 ? "#6d9ed8" : "#cd8985" }} />
              </div>
            </article>
          );
        })}
      </div>
      <footer className="flex shrink-0 items-center justify-between border-t border-white/[0.06] px-3 py-1.5 font-mono text-[8px] text-gray-500">
        <span>DECISION SUPPORT</span><span>{strategies.length} CALLS</span>
      </footer>
    </section>
  );
}
