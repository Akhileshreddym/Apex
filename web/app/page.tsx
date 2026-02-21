import TrackCanvas from "@/components/TrackCanvas";
import DriverCard from "@/components/DriverCard";
import PitWindow from "@/components/PitWindow";
import WeatherPanel from "@/components/WeatherPanel";
import TireDegradation from "@/components/TireDegradation";
import CarTimings from "@/components/CarTimings";
import StrategyPanel from "@/components/StrategyPanel";
import RaceHistory from "@/components/RaceHistory";

export default function PitWall() {
  return (
    <div className="h-screen w-screen flex flex-col bg-apex-bg overflow-hidden">
      {/* Top Bar */}
      <header className="h-10 flex items-center justify-between px-4 border-b border-apex-border bg-apex-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-apex-red" />
            <span className="font-mono text-xs font-bold tracking-widest text-gray-100">
              APEX
            </span>
          </div>
          <div className="w-px h-4 bg-gray-800" />
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
            PIT WALL — SILVERSTONE GRAND PRIX
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-apex-green animate-pulse-glow" />
            <span className="text-[10px] text-gray-500 font-mono">
              RACE — LAP 31/56
            </span>
          </div>
          <div className="w-px h-4 bg-gray-800" />
          <span className="text-[10px] text-gray-600 font-mono">
            SESSION: 1:02:34
          </span>
          <div className="w-px h-4 bg-gray-800" />
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-apex-cyan animate-pulse-glow" />
            <span className="text-[10px] text-apex-cyan font-mono">WS:LIVE</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-[280px_1fr_300px] grid-rows-[minmax(280px,1.2fr)_1fr] gap-px bg-apex-border overflow-hidden">
        {/* Left Column — Top: Driver Card */}
        <div className="row-span-1 flex flex-col gap-px bg-apex-border">
          <DriverCard />
        </div>

        {/* Center — Top: Track Canvas */}
        <div className="row-span-1">
          <TrackCanvas />
        </div>

        {/* Right Column — Top: Strategy */}
        <div className="row-span-1">
          <StrategyPanel />
        </div>

        {/* Left Column — Bottom: Pit + Weather + Tires */}
        <div className="row-span-1 flex flex-col gap-px bg-apex-border overflow-y-auto">
          <PitWindow />
          <WeatherPanel />
          <TireDegradation />
        </div>

        {/* Center — Bottom: Car Timings */}
        <div className="row-span-1">
          <CarTimings />
        </div>

        {/* Right Column — Bottom: Race History */}
        <div className="row-span-1">
          <RaceHistory />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-6 flex items-center justify-between px-4 border-t border-apex-border bg-apex-card shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-gray-600 font-mono">
            ENGINE: MONTE CARLO 10K SIMS
          </span>
          <div className="w-px h-3 bg-gray-800" />
          <span className="text-[9px] text-gray-600 font-mono">
            MODEL: XGBOOST v2.1
          </span>
          <div className="w-px h-3 bg-gray-800" />
          <span className="text-[9px] text-gray-600 font-mono">
            VOICE: ELEVENLABS ACTIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-700 font-mono">
            HACKLYTICS 2026
          </span>
          <div className="w-1 h-1 bg-apex-red" />
        </div>
      </footer>
    </div>
  );
}
