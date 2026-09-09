"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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

function Dashboard() {
  const chaos = useChaos();
  const [currentLap, setCurrentLap] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [allDrivers, setAllDrivers] = useState<any[]>([]);
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);
  const handleLapChange = useCallback((lap: number) => setCurrentLap(lap), []);
  const handleLeaderChange = useCallback((_leader: any, all?: any[]) => {
    if (all) setAllDrivers(all);
  }, []);
  const handleRaceEvent = useCallback((event: RaceEvent) => {
    setRaceEvents(prev => [event, ...prev]);
  }, []);
  const caution = trackStatusForLap(currentLap).Status >= 2;

  const [viewport, setViewport] = useState({ width: 1440, height: 900 });
  const shellRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const scale = Math.min(1, viewport.width / 1180, viewport.height / 700);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await shellRef.current?.requestFullscreen?.();
  };

  return (
    <div ref={shellRef} className="pitwall-viewport">
      <div className="pitwall-console" style={{ width: viewport.width / scale, height: viewport.height / scale, transform: `scale(${scale})` }}>
        <header className="command-header">
          <a href="/" className="pitwall-brand" aria-label="Apex home"><svg width="31" height="27" viewBox="0 0 31 27" fill="none" aria-hidden="true"><path d="M0 27 13 0h7L7 27H0Zm13 0 7-15 11 15h-9l-4-6-3 6h-2Z" fill="currentColor" /></svg><span>APEX</span></a>
          <span className="header-slash">/</span><div className="workspace-name">RACE OPERATIONS<span>PIT WALL · 01</span></div>
          <div className="event-identity"><span className="tricolore" /><strong>ITALIAN GRAND PRIX</strong><span>MONZA · 2023</span></div>
          <div className="header-actions"><span className="connection-indicator"><i className={chaos.connected ? 'signal-dot' : 'signal-dot offline'} />{chaos.connected ? 'ENGINE ONLINE' : 'DEMO MODE'}</span><a href="/ipad">Race control ↗</a><button onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{fullscreen ? '↙' : '⛶'}</button></div>
        </header>

        <section className="session-strip" aria-label="Race playback">
          <div className="lap-readout"><span>LAP</span><strong>{String(currentLap).padStart(2, '0')}</strong><span className="lap-total">/ 53</span></div>
          <div className={`flag-readout ${caution ? 'is-caution' : ''}`}><i /><strong>{currentLap >= 53 ? 'CHEQUERED FLAG' : caution ? 'YELLOW FLAG' : 'GREEN FLAG'}</strong><span>{currentLap >= 53 ? 'Session complete' : caution ? 'No overtaking' : 'Track clear'}</span></div>
          <div className="session-detail"><span>CIRCUIT</span><strong>5.793 <small>KM</small></strong></div>
          <div className="session-detail"><span>DISTANCE</span><strong>{Math.round(currentLap / 53 * 100)}<small>%</small></strong></div>
          <div className="playback-controls"><span>SIMULATION RATE</span><div className="rate-buttons">{[1, 2, 5, 10, 50].map(speed => <button key={speed} aria-pressed={playbackSpeed === speed} onClick={() => setPlaybackSpeed(speed)}>{speed}×</button>)}</div><button className="skip-button" aria-pressed={playbackSpeed === 5000} onClick={() => setPlaybackSpeed(5000)}>RESULTS <span>»</span></button></div>
          <div className="session-progress"><i style={{ width: `${currentLap / 53 * 100}%` }} /></div>
        </section>

        <aside className="radio-strip" aria-live="polite"><span className="radio-label"><svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><path d="M3 13V9a7 7 0 0114 0v4M3 10h3v7H3v-7Zm11 0h3v7h-3v-7Z" stroke="currentColor" strokeWidth="1.5" /></svg>RACE ENGINEER</span><span className="radio-event">{chaos.mathResults ? chaos.event.replaceAll('_', ' ') : 'STANDBY'}</span><p title={chaos.mathResults?.recommendation}>{chaos.mathResults?.recommendation || 'Monitoring race conditions. Strategy recommendations will appear here.'}</p><span className="radio-probability">WIN PROBABILITY <b>{chaos.mathResults ? `${chaos.mathResults.win_probability}%` : '—'}</b></span></aside>

        <main className="pitwall-grid" aria-label="Pit wall dashboard">
          <section className="driver-module" aria-label="Driver telemetry"><DriverCard allDrivers={allDrivers} currentLap={currentLap} customName="Brad Pitt" customPhoto="/driver_apx.jpg" /></section>
          <section className="circuit-module" aria-label="Circuit overview"><TrackCanvas onLapChange={handleLapChange} playbackSpeed={playbackSpeed} /></section>
          <section className="strategy-module" aria-label="Strategy recommendations"><StrategyPanel currentLap={currentLap} playbackSpeed={playbackSpeed} /></section>
          <section className="conditions-module" aria-label="Race conditions"><PitWindow currentLap={currentLap} /><WeatherPanel currentLap={currentLap} /><TireDegradation /></section>
          <section className="timing-module" aria-label="Driver standings"><CarTimings currentLap={currentLap} onLeaderChange={handleLeaderChange} onRaceEvent={handleRaceEvent} /></section>
          <section className="history-module" aria-label="Race event history"><RaceHistory currentLap={currentLap} raceEvents={raceEvents} /></section>
        </main>

        <footer className="console-footer"><span><i className="signal-dot" />SIMULATION SESSION <b>ITA / RACE</b></span><span className="footer-radio">{chaos.radioCall ? `RADIO / “${chaos.radioCall}”` : 'APEX RACING · RACE STRATEGY & TELEMETRY'}</span><span>HACKLYTICS <b>2026</b></span></footer>
      </div>
    </div>
  );
}

export default function PitWall() {
  return <ChaosProvider><Dashboard /></ChaosProvider>;
}
