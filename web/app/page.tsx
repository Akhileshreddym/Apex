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
      <header className="h-11 flex items-center justify-between px-5 shrink-0" style={{
        background: 'linear-gradient(180deg, rgba(14,21,37,0.95) 0%, rgba(10,15,26,0.9) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
      }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-apex-red rounded-sm" style={{ boxShadow: '0 0 8px rgba(239,68,68,0.4)' }} />
            <span className="text-xs font-bold tracking-[0.2em] text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              APEX
            </span>
          </div>
          <div className="w-px h-4 bg-white/6" />
          <span className="text-[10px] text-white/25 uppercase tracking-wider">
            PIT WALL — ITALIAN GRAND PRIX
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5 flex-1 justify-center px-4">
          {[1, 2, 5, 10, 50].map(speed => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2.5 py-1 text-[10px] font-mono rounded transition-all duration-200 ${playbackSpeed === speed
                  ? 'bg-apex-red text-white font-bold shadow-lg shadow-red-500/20'
                  : 'bg-white/[0.03] text-white/30 hover:bg-white/[0.06] hover:text-white/50'
                }`}
            >
              {speed}x
            </button>
          ))}
          <div className="w-px h-3 bg-white/6 mx-1" />
          <button
            onClick={() => setPlaybackSpeed(5000)}
            className={`px-3 py-1 text-[10px] font-mono rounded transition-all duration-200 ${playbackSpeed === 5000
                ? 'bg-apex-cyan text-black font-bold shadow-lg shadow-cyan-500/20'
                : 'bg-cyan-500/10 text-cyan-400/60 hover:bg-cyan-500/20 hover:text-cyan-400'
              }`}
          >
            SKIP TO RESULTS
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-apex-green animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.4)' }} />
            <span className="text-[10px] text-white/30 font-mono">
              RACE — LAP {currentLap}/53
            </span>
          </div>
          <div className="w-px h-3 bg-white/6" />
          <span className="text-[10px] text-white/15 font-mono">
            SESSION: 1:02:34
          </span>
          <div className="w-px h-3 bg-white/6" />
          <div className="flex items-center gap-1">
            <div className={`h-1.5 w-1.5 rounded-full ${chaos.connected ? 'bg-apex-cyan' : 'bg-white/20'} animate-pulse`} style={chaos.connected ? { boxShadow: '0 0 6px rgba(34,211,238,0.4)' } : {}} />
            <span className={`text-[10px] font-mono ${chaos.connected ? 'text-cyan-400/70' : 'text-white/15'}`}>
              {chaos.connected ? 'WS:LIVE' : 'WS:OFF'}
            </span>
          </div>
        </div>
      </header>

      {/* AI Radio Call Banner */}
      {chaos.radioCall && (
        <div className="px-5 py-2.5 flex items-start gap-3 shrink-0 animate-slide-in" style={{
          background: 'linear-gradient(90deg, rgba(239,68,68,0.08) 0%, rgba(10,15,26,0.4) 50%, rgba(10,15,26,0) 100%)',
          borderBottom: '1px solid rgba(239,68,68,0.08)',
          borderLeft: '2px solid rgba(239,68,68,0.5)',
        }}>
          <div className="shrink-0 mt-0.5">
            <div className="w-6 h-6 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center text-[10px]">📡</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                {chaos.event.toUpperCase().replace("_", " ")}
              </span>
              <span className="text-[9px] text-white/20 font-mono">AI ENGINEER</span>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed italic">
              &quot;{chaos.radioCall}&quot;
            </p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-[300px_1fr_280px] grid-rows-[1fr_1fr] gap-[3px] overflow-hidden min-h-0 p-[3px]" style={{ background: 'var(--apex-bg)' }}>
        <div className="row-span-1 min-h-0"><DriverCard allDrivers={allDrivers} currentLap={currentLap} customName={driverName} customPhoto={driverPhoto} /></div>
        <div className="row-span-1 min-h-0"><TrackCanvas onLapChange={handleLapChange} playbackSpeed={playbackSpeed} /></div>
        <div className="row-span-1 min-h-0"><StrategyPanel currentLap={currentLap} playbackSpeed={playbackSpeed} /></div>
        <div className="row-span-1 flex flex-col gap-[3px] overflow-y-auto min-h-0">
          <PitWindow currentLap={currentLap} />
          <WeatherPanel />
          <TireDegradation />
        </div>
        <div className="row-span-1 min-h-0"><CarTimings currentLap={currentLap} onLeaderChange={handleLeaderChange} onRaceEvent={handleRaceEvent} /></div>
        <div className="row-span-1 min-h-0"><RaceHistory currentLap={currentLap} raceEvents={raceEvents} /></div>
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-7 flex items-center justify-between px-5 shrink-0" style={{
        background: 'linear-gradient(180deg, rgba(10,15,26,0.8) 0%, rgba(6,10,18,0.95) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.03)',
      }}>
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`h-1.5 w-1.5 rounded-full ${trackStatusForLap(currentLap).Status >= 2 ? 'bg-yellow-500' : 'bg-apex-green'} animate-pulse`} />
            <span className={`text-[9px] font-mono font-bold ${trackStatusForLap(currentLap).Status >= 2 ? 'text-yellow-400' : 'text-white/25'}`}>
              {trackStatusForLap(currentLap).Status >= 2 ? 'YELLOW' : 'RUN'}
            </span>
          </div>
          <div className="w-px h-3 bg-white/5" />
          <span className="text-[9px] text-white/20 font-mono truncate">
            {chaos.mathResults
              ? `⚠ ${chaos.event.toUpperCase().replace("_", " ")} DETECTED — WIN PROB: ${chaos.mathResults.win_probability}% — ${chaos.mathResults.recommendation}`
              : trackStatusForLap(currentLap).Status >= 2
                ? "⚠ YELLOW FLAG — CAUTION ON TRACK — NO OVERTAKING"
                : "SYSTEMS NOMINAL — ALL CHANNELS ACTIVE"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] text-white/12 font-mono">MONTE CARLO 10K</span>
          <div className="w-px h-3 bg-white/5" />
          <span className="text-[9px] text-white/12 font-mono">SKLEARN v1</span>
          <div className="w-px h-3 bg-white/5" />
          <span className="text-[9px] text-white/8 font-mono">HACKLYTICS 2026</span>
          <div className="w-1 h-1 bg-red-500 rounded-sm" style={{ boxShadow: '0 0 4px rgba(239,68,68,0.3)' }} />
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
