"use client";

import { useState, useCallback, useRef } from "react";
import type { ChaosEvent } from "@/lib/types";

interface ChaosButton {
  event: ChaosEvent["event"];
  label: string;
  subtitle: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  intensity?: string;
}

const CHAOS_BUTTONS: ChaosButton[] = [
  {
    event: "rain",
    label: "SUDDEN RAIN",
    subtitle: "Heavy downpour — Inters or Wets?",
    icon: "⛈",
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.08)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    glowColor: "rgba(59, 130, 246, 0.25)",
    intensity: "heavy",
  },
  {
    event: "crash",
    label: "CRASH",
    subtitle: "Major incident — Debris on track",
    icon: "💥",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    glowColor: "rgba(239, 68, 68, 0.25)",
  },
  {
    event: "safety_car",
    label: "SAFETY CAR",
    subtitle: "SC deployed — Pack bunches up",
    icon: "🚗",
    color: "#eab308",
    bgColor: "rgba(234, 179, 8, 0.08)",
    borderColor: "rgba(234, 179, 8, 0.3)",
    glowColor: "rgba(234, 179, 8, 0.25)",
  },
  {
    event: "red_flag",
    label: "RED FLAG",
    subtitle: "Session stopped — All cars return",
    icon: "🟥",
    color: "#dc2626",
    bgColor: "rgba(220, 38, 38, 0.08)",
    borderColor: "rgba(220, 38, 38, 0.3)",
    glowColor: "rgba(220, 38, 38, 0.25)",
  },
  {
    event: "mechanical",
    label: "MECHANICAL",
    subtitle: "Random DNF — Engine or gearbox",
    icon: "🔧",
    color: "#f97316",
    bgColor: "rgba(249, 115, 22, 0.08)",
    borderColor: "rgba(249, 115, 22, 0.3)",
    glowColor: "rgba(249, 115, 22, 0.25)",
  },
  {
    event: "vsc",
    label: "VSC",
    subtitle: "Virtual safety car — Delta mode",
    icon: "🏴",
    color: "#a855f7",
    bgColor: "rgba(168, 85, 247, 0.08)",
    borderColor: "rgba(168, 85, 247, 0.3)",
    glowColor: "rgba(168, 85, 247, 0.25)",
  },
];

export default function StewardPage() {
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChaos = useCallback(
    (btn: ChaosButton) => {
      const payload: ChaosEvent = {
        event: btn.event,
        ...(btn.intensity && { intensity: btn.intensity }),
      };

      setActiveBtn(btn.event);
      setLastEvent(`${btn.icon} ${btn.label} INJECTED`);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setActiveBtn(null);
      }, 300);

      // In production, this sends via WebSocket:
      // send(payload);
      console.log("CHAOS EVENT:", payload);
    },
    []
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-apex-bg overflow-hidden">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-apex-border bg-apex-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-apex-red" />
            <span className="font-mono text-sm font-bold tracking-widest text-gray-100">
              APEX
            </span>
          </div>
          <div className="w-px h-5 bg-gray-800" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            RACE STEWARD CONSOLE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-apex-green animate-pulse-glow" />
          <span className="text-xs text-gray-500 font-mono">
            LAP 31 / 56
          </span>
        </div>
      </header>

      {/* Event Flash */}
      <div className="h-10 flex items-center justify-center bg-apex-card border-b border-apex-border">
        {lastEvent ? (
          <span className="font-mono text-sm font-bold text-apex-orange animate-slide-in">
            {lastEvent}
          </span>
        ) : (
          <span className="text-xs text-gray-700 font-mono uppercase">
            Tap to inject chaos into the simulation
          </span>
        )}
      </div>

      {/* Button Grid */}
      <div className="flex-1 grid grid-cols-2 gap-3 p-4 overflow-hidden">
        {CHAOS_BUTTONS.map((btn) => (
          <button
            key={btn.event}
            onClick={() => handleChaos(btn)}
            className="relative flex flex-col items-center justify-center gap-3 border-2 transition-all duration-150 active:scale-[0.97] select-none"
            style={{
              backgroundColor:
                activeBtn === btn.event ? btn.bgColor : "#0a0f1a",
              borderColor:
                activeBtn === btn.event ? btn.color : btn.borderColor,
              boxShadow:
                activeBtn === btn.event
                  ? `0 0 40px ${btn.glowColor}, inset 0 0 40px ${btn.glowColor}`
                  : "none",
            }}
          >
            <span className="text-5xl select-none">{btn.icon}</span>
            <span
              className="font-mono text-xl font-black tracking-wider"
              style={{ color: btn.color }}
            >
              {btn.label}
            </span>
            <span className="text-[11px] text-gray-500 font-mono text-center px-4">
              {btn.subtitle}
            </span>

            {/* Corner accents */}
            <div
              className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2"
              style={{ borderColor: btn.color + "44" }}
            />
            <div
              className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2"
              style={{ borderColor: btn.color + "44" }}
            />
            <div
              className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2"
              style={{ borderColor: btn.color + "44" }}
            />
            <div
              className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2"
              style={{ borderColor: btn.color + "44" }}
            />
          </button>
        ))}
      </div>

      {/* Footer */}
      <footer className="h-8 flex items-center justify-center border-t border-apex-border bg-apex-card shrink-0">
        <span className="text-[10px] text-gray-700 font-mono tracking-wider">
          APEX STEWARD v1.0 — HACKLYTICS 2026
        </span>
      </footer>
    </div>
  );
}
