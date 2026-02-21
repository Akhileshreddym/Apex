import type {
  TimingData,
  WeatherSample,
  PitWindowData,
  StrategyRec,
  RaceEvent,
  TireCompound,
} from "./types";

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
// TIMING DATA (FastF1 columns + backend-computed fields)
// Times as seconds from timedelta.total_seconds()
// ─────────────────────────────────

export const mockTimingData: TimingData[] = [
  { Position: 1,  DriverNumber: "1",  Abbreviation: "VER", FullName: "Max Verstappen",   TeamName: "Red Bull Racing",   TeamColor: "3671C6", GapToLeader: "LEADER",  IntervalToAhead: "—",      LastLapTime: 91.204,  BestLapTime: 90.856,  Sector1Time: 28.443, Sector2Time: 34.112, Sector3Time: 28.649, Compound: "MEDIUM",       TyreLife: 12, Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 2,  DriverNumber: "4",  Abbreviation: "NOR", FullName: "Lando Norris",     TeamName: "McLaren",           TeamColor: "FF8000", GapToLeader: "+1.832",  IntervalToAhead: "+1.832", LastLapTime: 91.456,  BestLapTime: 91.012,  Sector1Time: 28.556, Sector2Time: 34.289, Sector3Time: 28.611, Compound: "MEDIUM",       TyreLife: 12, Stint: 2, PitCount: 1, Status: "DRS" },
  { Position: 3,  DriverNumber: "16", Abbreviation: "LEC", FullName: "Charles Leclerc",  TeamName: "Ferrari",           TeamColor: "E8002D", GapToLeader: "+3.441",  IntervalToAhead: "+1.609", LastLapTime: 91.633,  BestLapTime: 91.198,  Sector1Time: 28.612, Sector2Time: 34.301, Sector3Time: 28.720, Compound: "HARD",         TyreLife: 8,  Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 4,  DriverNumber: "81", Abbreviation: "PIA", FullName: "Oscar Piastri",    TeamName: "McLaren",           TeamColor: "FF8000", GapToLeader: "+5.209",  IntervalToAhead: "+1.768", LastLapTime: 91.801,  BestLapTime: 91.340,  Sector1Time: 28.701, Sector2Time: 34.389, Sector3Time: 28.711, Compound: "MEDIUM",       TyreLife: 12, Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 5,  DriverNumber: "55", Abbreviation: "SAI", FullName: "Carlos Sainz",     TeamName: "Ferrari",           TeamColor: "E8002D", GapToLeader: "+7.112",  IntervalToAhead: "+1.903", LastLapTime: 91.992,  BestLapTime: 91.455,  Sector1Time: 28.789, Sector2Time: 34.401, Sector3Time: 28.802, Compound: "HARD",         TyreLife: 8,  Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 6,  DriverNumber: "63", Abbreviation: "RUS", FullName: "George Russell",   TeamName: "Mercedes",          TeamColor: "27F4D2", GapToLeader: "+9.034",  IntervalToAhead: "+1.922", LastLapTime: 92.101,  BestLapTime: 91.599,  Sector1Time: 28.834, Sector2Time: 34.456, Sector3Time: 28.811, Compound: "MEDIUM",       TyreLife: 14, Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 7,  DriverNumber: "44", Abbreviation: "HAM", FullName: "Lewis Hamilton",   TeamName: "Ferrari",           TeamColor: "E8002D", GapToLeader: "+11.220", IntervalToAhead: "+2.186", LastLapTime: 92.288,  BestLapTime: 91.701,  Sector1Time: 28.901, Sector2Time: 34.512, Sector3Time: 28.875, Compound: "HARD",         TyreLife: 8,  Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 8,  DriverNumber: "14", Abbreviation: "ALO", FullName: "Fernando Alonso",  TeamName: "Aston Martin",      TeamColor: "229971", GapToLeader: "+14.502", IntervalToAhead: "+3.282", LastLapTime: 92.501,  BestLapTime: 92.012,  Sector1Time: 29.012, Sector2Time: 34.601, Sector3Time: 28.888, Compound: "MEDIUM",       TyreLife: 18, Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 9,  DriverNumber: "18", Abbreviation: "STR", FullName: "Lance Stroll",     TeamName: "Aston Martin",      TeamColor: "229971", GapToLeader: "+16.889", IntervalToAhead: "+2.387", LastLapTime: 92.712,  BestLapTime: 92.198,  Sector1Time: 29.101, Sector2Time: 34.689, Sector3Time: 28.922, Compound: "HARD",         TyreLife: 22, Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 10, DriverNumber: "10", Abbreviation: "GAS", FullName: "Pierre Gasly",     TeamName: "Alpine",            TeamColor: "0093CC", GapToLeader: "+19.334", IntervalToAhead: "+2.445", LastLapTime: 92.890,  BestLapTime: 92.401,  Sector1Time: 29.178, Sector2Time: 34.734, Sector3Time: 28.978, Compound: "MEDIUM",       TyreLife: 20, Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 11, DriverNumber: "31", Abbreviation: "OCO", FullName: "Esteban Ocon",     TeamName: "Alpine",            TeamColor: "0093CC", GapToLeader: "+21.102", IntervalToAhead: "+1.768", LastLapTime: 93.012,  BestLapTime: 92.556,  Sector1Time: 29.234, Sector2Time: 34.801, Sector3Time: 28.977, Compound: "HARD",         TyreLife: 26, Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 12, DriverNumber: "22", Abbreviation: "TSU", FullName: "Yuki Tsunoda",     TeamName: "RB",                TeamColor: "6692FF", GapToLeader: "+23.445", IntervalToAhead: "+2.343", LastLapTime: 93.189,  BestLapTime: 92.678,  Sector1Time: 29.301, Sector2Time: 34.889, Sector3Time: 28.999, Compound: "MEDIUM",       TyreLife: 24, Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 13, DriverNumber: "23", Abbreviation: "ALB", FullName: "Alexander Albon",  TeamName: "Williams",          TeamColor: "64C4FF", GapToLeader: "+25.667", IntervalToAhead: "+2.222", LastLapTime: 93.334,  BestLapTime: 92.801,  Sector1Time: 29.378, Sector2Time: 34.945, Sector3Time: 29.011, Compound: "HARD",         TyreLife: 28, Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 14, DriverNumber: "27", Abbreviation: "HUL", FullName: "Nico Hulkenberg", TeamName: "Kick Sauber",       TeamColor: "52E252", GapToLeader: "+28.112", IntervalToAhead: "+2.445", LastLapTime: 93.501,  BestLapTime: 92.945,  Sector1Time: 29.445, Sector2Time: 35.012, Sector3Time: 29.044, Compound: "MEDIUM",       TyreLife: 26, Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 15, DriverNumber: "3",  Abbreviation: "RIC", FullName: "Daniel Ricciardo", TeamName: "RB",                TeamColor: "6692FF", GapToLeader: "+30.889", IntervalToAhead: "+2.777", LastLapTime: 93.678,  BestLapTime: 93.101,  Sector1Time: 29.512, Sector2Time: 35.089, Sector3Time: 29.077, Compound: "HARD",         TyreLife: 30, Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 16, DriverNumber: "77", Abbreviation: "BOT", FullName: "Valtteri Bottas",  TeamName: "Kick Sauber",       TeamColor: "52E252", GapToLeader: "+33.445", IntervalToAhead: "+2.556", LastLapTime: 93.856,  BestLapTime: 93.245,  Sector1Time: 29.589, Sector2Time: 35.145, Sector3Time: 29.122, Compound: "MEDIUM",       TyreLife: 28, Stint: 3, PitCount: 2, Status: "RACING" },
  { Position: 17, DriverNumber: "20", Abbreviation: "MAG", FullName: "Kevin Magnussen",  TeamName: "Haas F1 Team",      TeamColor: "B6BABD", GapToLeader: "+36.012", IntervalToAhead: "+2.567", LastLapTime: 94.012,  BestLapTime: 93.401,  Sector1Time: 29.645, Sector2Time: 35.201, Sector3Time: 29.166, Compound: "HARD",         TyreLife: 32, Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 18, DriverNumber: "2",  Abbreviation: "SAR", FullName: "Logan Sargeant",   TeamName: "Williams",          TeamColor: "64C4FF", GapToLeader: "+38.778", IntervalToAhead: "+2.766", LastLapTime: 94.198,  BestLapTime: 93.556,  Sector1Time: 29.712, Sector2Time: 35.278, Sector3Time: 29.208, Compound: "HARD",         TyreLife: 32, Stint: 2, PitCount: 1, Status: "RACING" },
  { Position: 19, DriverNumber: "24", Abbreviation: "ZHO", FullName: "Guanyu Zhou",      TeamName: "Kick Sauber",       TeamColor: "52E252", GapToLeader: "+41.334", IntervalToAhead: "+2.556", LastLapTime: 94.378,  BestLapTime: 93.712,  Sector1Time: 29.789, Sector2Time: 35.334, Sector3Time: 29.255, Compound: "MEDIUM",       TyreLife: 30, Stint: 3, PitCount: 2, Status: "RACING" },
  { Position: 20, DriverNumber: "11", Abbreviation: "PER", FullName: "Sergio Perez",     TeamName: "Red Bull Racing",   TeamColor: "3671C6", GapToLeader: "DNF",     IntervalToAhead: "—",      LastLapTime: null,    BestLapTime: 91.890,  Sector1Time: null,   Sector2Time: null,   Sector3Time: null,   Compound: "MEDIUM",       TyreLife: 0,  Stint: 1, PitCount: 0, Status: "OUT" },
];

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
  { LapNumber: 40, Rainfall: true,  AirTemp: 22.0, TrackTemp: 36.0 },
  { LapNumber: 44, Rainfall: true,  AirTemp: 21.0, TrackTemp: 32.0 },
  { LapNumber: 48, Rainfall: true,  AirTemp: 20.5, TrackTemp: 30.0 },
];

// ─────────────────────────────────
// PIT WINDOW (computed by backend from FastF1 lap data + Monte Carlo)
// ─────────────────────────────────

export const mockPitWindow: PitWindowData = {
  CurrentLap: 31,
  TotalLaps: 56,
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
  { id: "e1",  LapNumber: 31, Time: 3754, type: "strategy", description: "VER — TyreLife 12, deg at 48%. Monitoring for box window." },
  { id: "e2",  LapNumber: 30, Time: 3612, type: "overtake", description: "NOR overtakes LEC — DRS Zone 1 — P2" },
  { id: "e3",  LapNumber: 28, Time: 3405, type: "pit",      description: "HAM — Box — HARD fitted — Stint 2" },
  { id: "e4",  LapNumber: 27, Time: 3258, type: "weather",  description: "TrackTemp dropping. Humidity 68%. WindDirection 315°" },
  { id: "e5",  LapNumber: 25, Time: 3033, type: "pit",      description: "LEC — Box — HARD fitted — Stint 2" },
  { id: "e6",  LapNumber: 23, Time: 2772, type: "incident", description: "PER — Mechanical DNF — Engine failure T4" },
  { id: "e7",  LapNumber: 22, Time: 2641, type: "flag",     description: "VSC DEPLOYED — Debris on track T4" },
  { id: "e8",  LapNumber: 20, Time: 2422, type: "pit",      description: "VER — Box — MEDIUM fitted — Stint 2" },
  { id: "e9",  LapNumber: 18, Time: 2215, type: "overtake", description: "ALO overtakes STR — T6 outside line — P8" },
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
  { LapNumber: 20, TyreLife: 1,  DegPct: 100 },
  { LapNumber: 21, TyreLife: 2,  DegPct: 96 },
  { LapNumber: 22, TyreLife: 3,  DegPct: 91 },
  { LapNumber: 23, TyreLife: 4,  DegPct: 87 },
  { LapNumber: 24, TyreLife: 5,  DegPct: 82 },
  { LapNumber: 25, TyreLife: 6,  DegPct: 77 },
  { LapNumber: 26, TyreLife: 7,  DegPct: 72 },
  { LapNumber: 27, TyreLife: 8,  DegPct: 68 },
  { LapNumber: 28, TyreLife: 9,  DegPct: 63 },
  { LapNumber: 29, TyreLife: 10, DegPct: 59 },
  { LapNumber: 30, TyreLife: 11, DegPct: 54 },
  { LapNumber: 31, TyreLife: 12, DegPct: 48 },
];
