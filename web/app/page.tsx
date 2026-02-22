"use client";

import { useState, useCallback } from "react";
import type { RaceEvent } from "@/lib/types";
import TrackCanvas from "@/components/TrackCanvas";
import DriverCard from "@/components/DriverCard";
import PitWindow from "@/components/PitWindow";
import WeatherPanel from "@/components/WeatherPanel";
import TireDegradation from "@/components/TireDegradation";
import CarTimings from "@/components/CarTimings";
import StrategyPanel from "@/components/StrategyPanel";
import RaceHistory from "@/components/RaceHistory";
import { ChaosProvider, useChaos } from "@/lib/ChaosContext";
import { trackStatusForLap } from "@/lib/mock-data";

function Dashboard({ driverName, driverPhoto }: { driverName: string; driverPhoto: string }) {
  const chaos = useChaos();
  const [currentLap, setCurrentLap] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [allDrivers, setAllDrivers] = useState<any[]>([]);
  const handleLapChange = useCallback((lap: number) => setCurrentLap(lap), []);
  const handleLeaderChange = useCallback((leader: any, all?: any[]) => {
    if (all) setAllDrivers(all);
  }, []);
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);
  const handleRaceEvent = useCallback((event: RaceEvent) => {
    setRaceEvents(prev => [event, ...prev]);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-apex-bg overflow-hidden">
      {/* Top Bar */}
      <header className="h-10 flex items-center justify-between px-4 border-b border-apex-border bg-apex-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-apex-red" />
            <span className="font-mono text-xs font-bold tracking-widest text-gray-100">
              APEX
            </span>
          </div>
          <div className="w-px h-4 bg-gray-800" />
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
            PIT WALL — ITALIAN GRAND PRIX
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 flex-1 justify-center px-4">
          {[1, 2, 5, 10, 50].map(speed => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${playbackSpeed === speed ? 'bg-apex-red text-white font-bold' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {speed}x
            </button>
          ))}
          <div className="w-px h-3 bg-gray-700 mx-1" />
          <button
            onClick={() => setPlaybackSpeed(5000)}
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${playbackSpeed === 5000 ? 'bg-apex-cyan text-black font-bold' : 'bg-apex-cyan/20 text-apex-cyan hover:bg-apex-cyan/40'}`}
          >
            SKIP TO RESULTS
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-apex-green animate-pulse-glow" />
            <span className="text-[10px] text-gray-500 font-mono">
              RACE — LAP {currentLap}/53
            </span>
          </div>
          <div className="w-px h-4 bg-gray-800" />
          <span className="text-[10px] text-gray-600 font-mono">
            SESSION: 1:02:34
          </span>
          <div className="w-px h-4 bg-gray-800" />
          <div className="flex items-center gap-1">
            <div className={`h-1.5 w-1.5 rounded-full ${chaos.connected ? 'bg-apex-cyan' : 'bg-gray-600'} animate-pulse-glow`} />
            <span className={`text-[10px] font-mono ${chaos.connected ? 'text-apex-cyan' : 'text-gray-600'}`}>
              {chaos.connected ? 'WS:LIVE' : 'WS:OFF'}
            </span>
          </div>
        </div>
      </header>

      {/* AI Radio Call Banner */}
      {chaos.radioCall && (
        <div className="h-auto px-4 py-2 bg-gradient-to-r from-red-900/30 to-apex-card border-b border-red-800/40 flex items-start gap-3 shrink-0 animate-slide-in">
          <div className="shrink-0 mt-0.5">
            <div className="w-6 h-6 bg-red-500/15 border border-red-500/30 flex items-center justify-center text-[10px]">📡</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5">
                {chaos.event.toUpperCase().replace("_", " ")}
              </span>
              <span className="text-[9px] text-gray-600 font-mono">AI ENGINEER</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed italic">
              &quot;{chaos.radioCall}&quot;
            </p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-[300px_1fr_280px] grid-rows-[1fr_1fr] gap-px bg-apex-border overflow-hidden min-h-0">
        <div className="row-span-1 min-h-0"><DriverCard allDrivers={allDrivers} currentLap={currentLap} customName={driverName} customPhoto={driverPhoto} /></div>
        <div className="row-span-1 min-h-0"><TrackCanvas onLapChange={handleLapChange} playbackSpeed={playbackSpeed} /></div>
        <div className="row-span-1 min-h-0"><StrategyPanel currentLap={currentLap} playbackSpeed={playbackSpeed} /></div>
        <div className="row-span-1 flex flex-col gap-px bg-apex-border overflow-y-auto min-h-0">
          <PitWindow currentLap={currentLap} />
          <WeatherPanel />
          <TireDegradation />
        </div>
        <div className="row-span-1 min-h-0"><CarTimings currentLap={currentLap} onLeaderChange={handleLeaderChange} onRaceEvent={handleRaceEvent} /></div>
        <div className="row-span-1 min-h-0"><RaceHistory currentLap={currentLap} raceEvents={raceEvents} /></div>
      </div>

      {/* Bottom Status Ticker Bar */}
      <footer className="h-7 flex items-center justify-between px-4 border-t border-apex-border bg-apex-card shrink-0">
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`h-1.5 w-1.5 ${trackStatusForLap(currentLap).Status >= 2 ? 'bg-yellow-500' : 'bg-apex-green'} animate-pulse-glow rounded-full`} />
            <span className={`text-[9px] font-mono font-bold ${trackStatusForLap(currentLap).Status >= 2 ? 'text-yellow-400' : 'text-gray-500'}`}>
              {trackStatusForLap(currentLap).Status >= 2 ? 'YELLOW' : 'RUN'}
            </span>
          </div>
          <div className="w-px h-3 bg-gray-800" />
          <span className="text-[9px] text-gray-500 font-mono truncate">
            {chaos.mathResults
              ? `⚠ ${chaos.event.toUpperCase().replace("_", " ")} DETECTED — WIN PROB: ${chaos.mathResults.win_probability}% — ${chaos.mathResults.recommendation}`
              : trackStatusForLap(currentLap).Status >= 2
                ? "⚠ YELLOW FLAG — CAUTION ON TRACK — NO OVERTAKING"
                : "SYSTEMS NOMINAL — ALL CHANNELS ACTIVE"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] text-gray-600 font-mono">ENGINE: MONTE CARLO 10K</span>
          <div className="w-px h-3 bg-gray-800" />
          <span className="text-[9px] text-gray-600 font-mono">MODEL: SKLEARN v1</span>
          <div className="w-px h-3 bg-gray-800" />
          <span className="text-[9px] text-gray-700 font-mono">HACKLYTICS 2026</span>
          <div className="w-1 h-1 bg-apex-red" />
        </div>
      </footer>
    </div>
  );
}

export default function PitWall() {
  return (
    <ChaosProvider>
      <Dashboard driverName="Brad Pitt" driverPhoto="/driver_apx.jpg" />
    </ChaosProvider>
  );
}
