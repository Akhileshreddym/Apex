import type {
  TimingData,
  WeatherSample,
  PitWindowData,
  StrategyRec,
  RaceEvent,
  TireCompound,
} from "./types";
import rawTimingData from "./timing_data.json";
import rawWeatherData from "./weather_data.json";
import rawRaceEvents from "./race_events_data.json";
import rawTrackStatus from "./track_status_data.json";

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
// WEATHER — real time-series from FastF1 session.weather_data
// 156 samples spanning the full race session (~60 s apart)
// ─────────────────────────────────

export const weatherTimeSeries: WeatherSample[] = rawWeatherData as WeatherSample[];

/**
 * Look up the weather sample closest to a given lap number.
 * Monza average lap ~86 s, so session time ≈ lap × 86.
 */
export function weatherForLap(lap: number): WeatherSample {
  const approxTime = lap * 86;
  let best = weatherTimeSeries[0];
  let bestDist = Math.abs(best.Time - approxTime);
  for (const s of weatherTimeSeries) {
    const d = Math.abs(s.Time - approxTime);
    if (d < bestDist) { best = s; bestDist = d; }
  }
  return best;
}

/**
 * Return the next `count` weather samples *after* the current lap.
 * Used for the forecast strip.
 */
export function weatherForecastForLap(lap: number, count = 4): (WeatherSample & { ForecastLap: number })[] {
  const approxTime = lap * 86;
  const startIdx = weatherTimeSeries.findIndex(s => s.Time > approxTime);
  if (startIdx === -1) return [];
  const step = 3;
  const result: (WeatherSample & { ForecastLap: number })[] = [];
  for (let i = 0; i < count; i++) {
    const idx = startIdx + i * step;
    if (idx >= weatherTimeSeries.length) break;
    const s = weatherTimeSeries[idx];
    result.push({ ...s, ForecastLap: Math.round(s.Time / 86) });
  }
  return result;
}

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
// RACE EVENTS — real FIA race control messages from FastF1
// Sorted newest-first for the live feed display
// ─────────────────────────────────

export const raceEvents: RaceEvent[] = (rawRaceEvents as RaceEvent[]).slice().reverse();

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

// ─────────────────────────────────
// TRACK STATUS — real FIA track status from FastF1
// Status codes: 1=AllClear, 2=Yellow, 4=SC, 5=Red, 6=VSC
// ─────────────────────────────────

export interface TrackStatusEvent {
  Time: number;
  Status: number;
  Message: string;
  Lap: number;
}

export const trackStatusEvents: TrackStatusEvent[] = rawTrackStatus as TrackStatusEvent[];

/**
 * Return the active track status for a given lap.
 * Walks through events chronologically and picks the last one
 * whose time is at or before the current lap.
 */
export function trackStatusForLap(lap: number): TrackStatusEvent {
  const approxTime = lap * 86;
  let current = trackStatusEvents[0];
  for (const evt of trackStatusEvents) {
    if (evt.Time <= approxTime) current = evt;
    else break;
  }
  return current;
}
