"use client";

import { instrumentColor } from "@/lib/display-colors";

import { useState, useEffect } from "react";
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
  "Brad Pitt": "🇺🇸",
};

interface DriverCardProps {
  allDrivers?: any[];
  currentLap?: number;
  customName?: string;
  customPhoto?: string;
}

const FOCUS_DRIVER = "APX"; // Focus on the player's car

export default function DriverCard({ allDrivers, currentLap = 1, customName, customPhoto }: DriverCardProps) {
  // Always find the focused driver in live data, fallback to finding them in mock data
  const d =
    allDrivers?.find((dr: any) => dr.Abbreviation === FOCUS_DRIVER) ??
    mockTimingData.find((dr: any) => dr.Abbreviation === FOCUS_DRIVER) ??
    mockTimingData[0];
  const tireColor = instrumentColor(TIRE_COLORS[d.Compound] ?? "#64748b");

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

  const displayName = customName || (d.Abbreviation === "APX" ? "Brad Pitt" : d.FullName);
  const firstName = displayName?.split(" ")[0] ?? "";
  const lastName = displayName?.split(" ").slice(1).join(" ") ?? "";
  const flag = d.Abbreviation === "APX" ? "🇺🇸" : (COUNTRY_FLAGS[d.FullName] ?? "🏁");
  const driverTeam = d.Abbreviation === "APX" ? "APEX RACING" : d.TeamName;

  return (
    <div className="apex-card relative flex h-full min-h-0 flex-col overflow-hidden" style={{ padding: 12, gap: 10 }}>
      <div className="flex shrink-0 items-center justify-between" style={{ marginBottom: 0 }}>
        <span style={{ fontSize: 9, letterSpacing: "0.16em", fontWeight: 700, color: "#96a3ad" }}>CAR TELEMETRY</span>
        <span className="flex items-center gap-1.5 font-mono" style={{ fontSize: 9, color: "#8da2a9" }}>
          <span className="h-1 w-1 rounded-full" style={{ background: raceOver ? "#8da2a9" : "#8eb9ef" }} />
          {raceOver ? "SESSION END" : "SIMULATED"}
        </span>
      </div>

      <div className="flex min-h-0 items-center gap-2.5">
        <div className="relative shrink-0 overflow-hidden" style={{ width: 44, height: 49, background: "#292b2d", borderRadius: 3 }}>
          <img src={d.Abbreviation === "APX" ? (customPhoto || "/driver_apx.jpg") : "/driver_ver.png"} alt={displayName} className="h-full w-full object-cover object-top" style={{ borderRadius: 3 }} />
          <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "#8eb9ef" }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate uppercase" style={{ fontSize: 10, color: "#93a0aa", lineHeight: 1.3 }}>{firstName} <span style={{ fontSize: 10 }}>{flag}</span></div>
          <div className="truncate font-bold uppercase" style={{ fontSize: 22, letterSpacing: "-.04em", lineHeight: 1.1, color: "#f1f5f5" }}>{lastName || firstName}</div>
          <div className="truncate uppercase" style={{ fontSize: 8, letterSpacing: ".11em", marginTop: 3, color: "#7f8d99" }}>{driverTeam}</div>
        </div>
        <div className="shrink-0 text-right">
          <div style={{ fontSize: 8, letterSpacing: ".12em", color: "#7f8d99" }}>POSITION</div>
          <div className="font-mono font-bold" style={{ fontSize: 30, lineHeight: 1.15, color: "#8eb9ef", letterSpacing: "-.08em" }}><span style={{ fontSize: 12, marginRight: 2 }}>P</span>{d.Position}</div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col justify-center" style={{ padding: "7px 8px", background: "#111111", border: "1px solid #333333", borderRadius: 4 }}>
        <div className="grid grid-cols-[1fr_.65fr_1fr] items-end gap-2">
          {[{ label: "KM/H", value: telemetry.speed }, { label: "GEAR", value: telemetry.gear }, { label: "RPM", value: telemetry.rpm.toLocaleString() }].map((item, index) => (
            <div key={item.label} className={index === 2 ? "text-right" : ""}>
              <div className="font-mono font-semibold" style={{ fontSize: index === 2 ? 19 : 25, lineHeight: 1.15, color: index === 1 ? "#8eb9ef" : "#eff4f5", letterSpacing: "-.055em" }}>{item.value}</div>
              <div style={{ fontSize: 8, color: "#778792", letterSpacing: ".12em", marginTop: 3 }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-0.5" aria-label={`Engine speed ${telemetry.rpm} RPM`}>
          {Array.from({ length: 24 }, (_, index) => <span key={index} className="flex-1" style={{ height: 3, background: index / 24 < telemetry.rpm / 13000 ? (index > 19 ? "#d1ac70" : index > 14 ? "#7da6da" : "#496e9a") : "#333639" }} />)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 shrink-0">
        {[{ label: "S1", value: formatSectorTime(d.Sector1Time) }, { label: "S2", value: formatSectorTime(d.Sector2Time) }, { label: "S3", value: formatSectorTime(d.Sector3Time) }].map((sector) => (
          <div key={sector.label} style={{ borderTop: "2px solid #585d60", paddingTop: 4 }}>
            <div className="flex items-baseline justify-between gap-1"><span style={{ fontSize: 8, color: "#7d8d98" }}>{sector.label}</span><span className="font-mono" style={{ fontSize: 10, color: "#d7e1e4" }}>{sector.value}</span></div>
          </div>
        ))}
      </div>

      <div className="shrink-0" style={{ borderTop: "1px solid #333333", paddingTop: 7 }}>
        <div className="grid grid-cols-3 gap-1">
          {[{ label: "LAST LAP", value: formatLapTime(d.LastLapTime), color: "#dce5e7" }, { label: "BEST LAP", value: formatLapTime(d.BestLapTime), color: "#b49bd7" }, { label: "TO LEADER", value: d.GapToLeader, color: "#87b9df" }].map((stat) => (
            <div key={stat.label}><div style={{ fontSize: 7, letterSpacing: ".08em", color: "#7d8d98" }}>{stat.label}</div><div className="font-mono font-medium" style={{ fontSize: 11, marginTop: 2, color: stat.color }}>{stat.value}</div></div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2" style={{ fontSize: 8, letterSpacing: ".07em", color: "#8c9aa4" }}>
          <span className="flex items-center gap-1.5 uppercase"><span className="h-2 w-2 rounded-full" style={{ border: `2px solid ${tireColor}` }} />{d.Compound} <span className="font-mono" style={{ color: "#d3dce0" }}> / {d.TyreLife} LAPS</span></span>
          <span>{d.PitCount} PIT STOP{d.PitCount !== 1 ? "S" : ""}</span>
        </div>
      </div>
    </div>
  );
}
