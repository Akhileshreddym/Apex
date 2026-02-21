"use client";

import { useState, useEffect, useRef } from "react";
import { mockTimingData, TIRE_COLORS } from "@/lib/mock-data";
import { formatLapTime, formatSectorTime } from "@/lib/format";

// Country flags for 2023 grid drivers
const COUNTRY_FLAGS: Record<string, string> = {
  "Max Verstappen": "🇳🇱",
  "Carlos Sainz": "🇪🇸",
  "George Russell": "🇬🇧",
  "Lewis Hamilton": "🇬🇧",
  "Sergio Perez": "🇲🇽",
  "Charles Leclerc": "🇲🇨",
  "Lance Stroll": "🇨🇦",
  "Valtteri Bottas": "🇫🇮",
  "Alexander Albon": "🇹🇭",
  "Fernando Alonso": "🇪🇸",
  "Oscar Piastri": "🇦🇺",
  "Lando Norris": "🇬🇧",
  "Esteban Ocon": "🇫🇷",
  "Logan Sargeant": "🇺🇸",
  "Kevin Magnussen": "🇩🇰",
  "Liam Lawson": "🇳🇿",
  "Nico Hulkenberg": "🇩🇪",
  "Guanyu Zhou": "🇨🇳",
  "Pierre Gasly": "🇫🇷",
};

interface DriverCardProps {
  allDrivers?: any[];
  currentLap?: number;
}

const FOCUS_DRIVER = "VER"; // Always focus on Verstappen

export default function DriverCard({ allDrivers, currentLap = 31 }: DriverCardProps) {
  // Always find VER in the live data, fall back to mock
  const d = allDrivers?.find((dr: any) => dr.Abbreviation === FOCUS_DRIVER) ?? mockTimingData[0];
  const tireColor = TIRE_COLORS[d.Compound] ?? "#64748b";

  // Simulate speed, gear, and RPM that update every tick
  const raceOver = currentLap >= 53;
  const [telemetry, setTelemetry] = useState({ speed: 312, gear: 8, rpm: 11500 });

  useEffect(() => {
    if (raceOver) {
      setTelemetry({ speed: 0, gear: 0, rpm: 0 });
      return;
    }
    const interval = setInterval(() => {
      setTelemetry({
        speed: Math.round(280 + Math.random() * 50),
        gear: Math.floor(6 + Math.random() * 3),
        rpm: Math.round(10000 + Math.random() * 2500),
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [raceOver]);

  const firstName = d.FullName?.split(" ")[0] ?? "";
  const lastName = d.FullName?.split(" ").slice(1).join(" ") ?? "";
  const flag = COUNTRY_FLAGS[d.FullName] ?? "🏁";

  return (
    <div className="apex-card flex flex-col h-full overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <span className="apex-label">DRIVER FOCUS</span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5"
          style={{ backgroundColor: `#${d.TeamColor}22`, color: `#${d.TeamColor}` }}
        >
          P{d.Position}
        </span>
      </div>

      {/* Main layout: Photo left, Info right */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Driver Photo — large, matching reference */}
        <div
          className="w-[130px] shrink-0 overflow-hidden relative"
          style={{
            borderLeft: `3px solid #${d.TeamColor}`,
            background: `linear-gradient(135deg, #${d.TeamColor}15, #0a0f1a)`,
          }}
        >
          <img
            src="/driver_ver.png"
            alt={d.FullName}
            className="w-full h-full object-cover object-top"
          />
          {/* Bottom gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 h-12"
            style={{ background: "linear-gradient(transparent, #0a0f1a)" }}
          />
          {/* Team color glow at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ background: `#${d.TeamColor}` }}
          />
        </div>

        {/* Right side: Name + Telemetry + Timing */}
        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
          {/* Name block */}
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-lg leading-none">{flag}</span>
              <span
                className="text-sm font-bold text-gray-300 uppercase tracking-wide"
                style={{ lineHeight: 1.1 }}
              >
                {firstName}
              </span>
            </div>
            <div
              className="text-xl font-black uppercase tracking-tight truncate"
              style={{ color: `#${d.TeamColor}`, lineHeight: 1 }}
            >
              {lastName}
            </div>
            <div className="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">
              {d.TeamName}
            </div>
          </div>

          {/* Live Telemetry — Speed / Gear / RPM */}
          <div className="flex flex-col gap-0.5 mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[9px] text-gray-500 uppercase w-10">SPEED:</span>
              <span className="font-mono text-base font-black text-gray-100 transition-all duration-300">
                {telemetry.speed}
              </span>
              <span className="text-[9px] text-gray-500">km/h</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[9px] text-gray-500 uppercase w-10">GEAR:</span>
              <span className="font-mono text-base font-black text-gray-100 transition-all duration-300">
                {telemetry.gear}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[9px] text-gray-500 uppercase w-10">RPM:</span>
              <span className="font-mono text-base font-black text-gray-100 transition-all duration-300">
                {telemetry.rpm.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Tire badge */}
          <div className="flex items-center gap-2 mt-2">
            <div
              className="h-5 px-2 flex items-center text-[9px] font-bold uppercase"
              style={{
                backgroundColor: tireColor + "22",
                color: tireColor,
                border: `1px solid ${tireColor}44`,
              }}
            >
              {d.Compound} — L{d.TyreLife}
            </div>
            <span className="text-[9px] text-gray-500 font-mono">
              {d.PitCount} STOP{d.PitCount !== 1 ? "S" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom stats bar — Sectors + Lap Times */}
      <div className="border-t border-gray-800/60 mt-2 pt-2 shrink-0">
        {/* Sector times */}
        <div className="grid grid-cols-3 gap-1">
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

        {/* Last / Best / Gap */}
        <div className="grid grid-cols-3 gap-1 mt-1.5">
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
    </div>
  );
}
