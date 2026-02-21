// ──────────────────────────────────────────────
// RAW FASTF1 TYPES — match column names exactly
// ──────────────────────────────────────────────

// fastf1.core.SessionResults row
export interface DriverResult {
  DriverNumber: string;
  BroadcastName: string;
  FullName: string;
  Abbreviation: string;
  TeamName: string;
  TeamColor: string;
  FirstName: string;
  LastName: string;
  HeadshotUrl: string;
  CountryCode: string;
  Position: number;
  ClassifiedPosition: string;
  GridPosition: number;
  Status: string;
  Points: number;
}

// fastf1.core.Laps row (times serialised as seconds)
export interface LapData {
  Time: number | null;
  Driver: string;
  DriverNumber: string;
  LapTime: number | null;
  LapNumber: number;
  Stint: number;
  PitOutTime: number | null;
  PitInTime: number | null;
  Sector1Time: number | null;
  Sector2Time: number | null;
  Sector3Time: number | null;
  Sector1SessionTime: number | null;
  Sector2SessionTime: number | null;
  Sector3SessionTime: number | null;
  SpeedI1: number;
  SpeedI2: number;
  SpeedFL: number;
  SpeedST: number;
  IsPersonalBest: boolean;
  Compound: TireCompound;
  TyreLife: number;
  FreshTyre: boolean;
  Team: string;
  LapStartTime: number | null;
  TrackStatus: string;
  Position: number;
  Deleted: boolean;
  IsAccurate: boolean;
}

// fastf1 compound strings (UPPERCASE as returned by the API)
export type TireCompound =
  | "SOFT"
  | "MEDIUM"
  | "HARD"
  | "INTERMEDIATE"
  | "WET"
  | "UNKNOWN"
  | "TEST_UNKNOWN";

// fastf1.core.Telemetry row
export interface TelemetryPoint {
  Time: number;
  SessionTime: number;
  Speed: number;
  RPM: number;
  nGear: number;
  Throttle: number;
  Brake: boolean;
  DRS: number;
  X: number;
  Y: number;
  Z: number;
  Source: string;
  Distance: number;
}

// session.weather_data row
export interface WeatherSample {
  Time: number;
  AirTemp: number;
  Humidity: number;
  Pressure: number;
  Rainfall: boolean;
  TrackTemp: number;
  WindDirection: number;
  WindSpeed: number;
}

// session.race_control_messages row
export interface RaceControlMessage {
  Time: number;
  Category: string;
  Message: string;
  Status: string;
  Flag: string;
  Scope: string;
  RacingNumber: string;
}

// session.track_status row
export interface TrackStatusEntry {
  Time: number;
  Status: string;
  Message: string;
}

// ──────────────────────────────────────────────
// COMPUTED / DERIVED TYPES — sent by our backend
// ──────────────────────────────────────────────

// Live timing row: FastF1 fields + backend-computed gap/interval/pitCount
export interface TimingData {
  Position: number;
  DriverNumber: string;
  Abbreviation: string;
  FullName: string;
  TeamName: string;
  TeamColor: string;
  GapToLeader: string;
  IntervalToAhead: string;
  LastLapTime: number | null;
  BestLapTime: number | null;
  Sector1Time: number | null;
  Sector2Time: number | null;
  Sector3Time: number | null;
  Compound: TireCompound;
  TyreLife: number;
  Stint: number;
  PitCount: number;
  Status: "RACING" | "PIT" | "OUT" | "DRS";
}

// Backend-computed pit strategy analysis
export interface PitWindowData {
  CurrentLap: number;
  TotalLaps: number;
  OptimalWindow: [number, number];
  UndercutLap: number;
  UndercutDelta: number;
  OvercutLap: number;
  OvercutDelta: number;
  PitLossTime: number;
}

// Backend-computed Monte Carlo strategy recommendation
export interface StrategyRec {
  id: string;
  LapNumber: number;
  priority: "critical" | "high" | "medium" | "low";
  action: string;
  Compound: TireCompound;
  winProb: number;
  detail: string;
}

// Race event (derived from RaceControlMessages + our backend logic)
export interface RaceEvent {
  id: string;
  LapNumber: number;
  Time: number;
  type: "pit" | "overtake" | "incident" | "weather" | "strategy" | "flag";
  description: string;
}

// Chaos events emitted from iPad to backend
export interface ChaosEvent {
  event: "rain" | "crash" | "safety_car" | "red_flag" | "mechanical" | "vsc";
  intensity?: string;
  driver?: string;
}
