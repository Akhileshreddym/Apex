import type {
  TimingData,
  WeatherSample,
  PitWindowData,
  StrategyRec,
  RaceEvent,
  TireCompound,
} from "./types";
import rawTimingData from "./timing_data.json";

// ─────────────────────────────────
// TIRE COLORS (keyed by FastF1 compound strings)
// ─────────────────────────────────

export const TIRE_COLORS: Record<string, string> = {
  SOFT: "#ef4444",
  MEDIUM: "#eab308",
  HARD: "#f1f5f9",
  INTERMEDIATE: "#22c55e",
  WET: "#3b82f6",
  UNKNOWN: "#64748b",
  TEST_UNKNOWN: "#64748b",
};

// ─────────────────────────────────
// TIMING DATA — loaded from real Monza laps_data.csv
// ─────────────────────────────────

export const mockTimingData: TimingData[] = rawTimingData as TimingData[];

// ─────────────────────────────────
// WEATHER (matches session.weather_data columns)
// ─────────────────────────────────

export const mockWeather: WeatherSample = {
  Time: 3754.0,
  AirTemp: 24.0,
  Humidity: 68.0,
  Pressure: 1013.2,
  Rainfall: false,
  TrackTemp: 42.0,
  WindDirection: 315,
  WindSpeed: 3.4,
};

// Weather forecast — not in FastF1, computed by our backend
export interface WeatherForecast {
  LapNumber: number;
  Rainfall: boolean;
  AirTemp: number;
  TrackTemp: number;
}

export const mockWeatherForecast: WeatherForecast[] = [
  { LapNumber: 36, Rainfall: false, AirTemp: 23.5, TrackTemp: 40.0 },
  { LapNumber: 40, Rainfall: true, AirTemp: 22.0, TrackTemp: 36.0 },
  { LapNumber: 44, Rainfall: true, AirTemp: 21.0, TrackTemp: 32.0 },
  { LapNumber: 48, Rainfall: true, AirTemp: 20.5, TrackTemp: 30.0 },
];

// ─────────────────────────────────
// PIT WINDOW (computed by backend from FastF1 lap data + Monte Carlo)
// ─────────────────────────────────

export const mockPitWindow: PitWindowData = {
  CurrentLap: 31,
  TotalLaps: 53,
  OptimalWindow: [33, 38],
  UndercutLap: 33,
  UndercutDelta: -0.8,
  OvercutLap: 37,
  OvercutDelta: 0.3,
  PitLossTime: 22.4,
};

// ─────────────────────────────────
// STRATEGY RECS (backend Monte Carlo output)
// Compound uses FastF1 UPPERCASE strings
// ─────────────────────────────────

export const mockStrategies: StrategyRec[] = [
  {
    id: "s1",
    LapNumber: 31,
    priority: "critical",
    action: "BOX BOX BOX",
    Compound: "INTERMEDIATE",
    winProb: 82,
    detail: "Rain probability rising. Switch to intermediates at Lap 33 for optimal window. Monte Carlo: 8,200/10,000 sims favor early box.",
  },
  {
    id: "s2",
    LapNumber: 28,
    priority: "high",
    action: "EXTEND STINT",
    Compound: "MEDIUM",
    winProb: 64,
    detail: "Tire deg within threshold. Current delta to P2: +1.8s. Maintain position. Overcut window opens Lap 37.",
  },
  {
    id: "s3",
    LapNumber: 24,
    priority: "medium",
    action: "PUSH NOW",
    Compound: "MEDIUM",
    winProb: 71,
    detail: "Gap to P3 closing. Leclerc on fresh hards. Deploy ERS Mode 8 for sectors 2-3 to build buffer.",
  },
];

// ─────────────────────────────────
// RACE EVENTS (derived from RaceControlMessages + backend logic)
// Times as seconds from session start
// ─────────────────────────────────

export const mockRaceEvents: RaceEvent[] = [
  { id: "e1", LapNumber: 31, Time: 3754, type: "strategy", description: "VER — TyreLife 12, deg at 48%. Monitoring for box window." },
  { id: "e2", LapNumber: 30, Time: 3612, type: "overtake", description: "NOR overtakes LEC — DRS Zone 1 — P2" },
  { id: "e3", LapNumber: 28, Time: 3405, type: "pit", description: "HAM — Box — HARD fitted — Stint 2" },
  { id: "e4", LapNumber: 27, Time: 3258, type: "weather", description: "TrackTemp dropping. Humidity 68%. WindDirection 315°" },
  { id: "e5", LapNumber: 25, Time: 3033, type: "pit", description: "LEC — Box — HARD fitted — Stint 2" },
  { id: "e6", LapNumber: 23, Time: 2772, type: "incident", description: "PER — Mechanical DNF — Engine failure T4" },
  { id: "e7", LapNumber: 22, Time: 2641, type: "flag", description: "VSC DEPLOYED — Debris on track T4" },
  { id: "e8", LapNumber: 20, Time: 2422, type: "pit", description: "VER — Box — MEDIUM fitted — Stint 2" },
  { id: "e9", LapNumber: 18, Time: 2215, type: "overtake", description: "ALO overtakes STR — T6 outside line — P8" },
  { id: "e10", LapNumber: 15, Time: 1811, type: "strategy", description: "Pit window opening. Leaders on aging SOFT." },
];

// ─────────────────────────────────
// TIRE DEGRADATION (computed by backend from FastF1 TyreLife + LapTime)
// Percentage remaining = estimated grip relative to fresh tire
// ─────────────────────────────────

export interface TireDegPoint {
  LapNumber: number;
  TyreLife: number;
  DegPct: number;
}

export const mockTireDeg: TireDegPoint[] = [
  { LapNumber: 20, TyreLife: 1, DegPct: 100 },
  { LapNumber: 21, TyreLife: 2, DegPct: 96 },
  { LapNumber: 22, TyreLife: 3, DegPct: 91 },
  { LapNumber: 23, TyreLife: 4, DegPct: 87 },
  { LapNumber: 24, TyreLife: 5, DegPct: 82 },
  { LapNumber: 25, TyreLife: 6, DegPct: 77 },
  { LapNumber: 26, TyreLife: 7, DegPct: 72 },
  { LapNumber: 27, TyreLife: 8, DegPct: 68 },
  { LapNumber: 28, TyreLife: 9, DegPct: 63 },
  { LapNumber: 29, TyreLife: 10, DegPct: 59 },
  { LapNumber: 30, TyreLife: 11, DegPct: 54 },
  { LapNumber: 31, TyreLife: 12, DegPct: 48 },
];
