"use client";

import { useState, useEffect, useRef } from "react";
import { useChaos } from "@/lib/ChaosContext";
import { mockTimingData, TIRE_COLORS, trackStatusForLap, weatherForLap } from "@/lib/mock-data";
import { formatLapTime } from "@/lib/format";
import type { RaceEvent } from "@/lib/types";

// Extend TimingData with our internal tracking metrics
export type TimingDataRow = typeof mockTimingData[number];

interface SimulationDriver extends TimingDataRow {
  CumulativeTime: number;
}

interface CarTimingsProps {
  currentLap: number;
  onLeaderChange?: (leader: SimulationDriver, allDrivers: SimulationDriver[]) => void;
  onRaceEvent?: (event: RaceEvent) => void;
}

export default function CarTimings({ currentLap, onLeaderChange, onRaceEvent }: CarTimingsProps) {
  const chaos = useChaos();

  // Keep callback refs stable
  const onLeaderChangeRef = useRef(onLeaderChange);
  useEffect(() => { onLeaderChangeRef.current = onLeaderChange; }, [onLeaderChange]);
  const onRaceEventRef = useRef(onRaceEvent);
  useEffect(() => { onRaceEventRef.current = onRaceEvent; }, [onRaceEvent]);

  // Store pending notification data to fire AFTER render (avoids setState-during-render)
  const pendingNotifyRef = useRef<{ leader: SimulationDriver; all: SimulationDriver[] } | null>(null);

  // Track the current visual lap without triggering effect restarts
  const lapRef = useRef(currentLap);
  useEffect(() => {
    lapRef.current = currentLap;
  }, [currentLap]);

  // Pending race events ref to defer emission after render
  const pendingEventsRef = useRef<RaceEvent[]>([]);
  const processedChaosRef = useRef<Set<string>>(new Set());

  // Empty array of drivers to bootstrap state
  const [timingData, setTimingData] = useState<SimulationDriver[]>([]);

  // Track the last processed chaos event to ensure one-time triggers (like targeted crashes) happen exactly once per event
  const lastEventIdRef = useRef<string>("");
  const currentVictimRef = useRef<string>("");

  // Initialize with initial standings and calculate base cumulative time
  useEffect(() => {
    if (timingData.length === 0) {
      setTimingData(
        mockTimingData.map((d) => {
          let baseOffset = 0;
          if (d.GapToLeader !== "LEADER" && d.GapToLeader !== "DNF" && d.Status !== "OUT") {
            baseOffset = parseFloat(d.GapToLeader.replace("+", "")) || 0;
          }
          return {
            ...d,
            CumulativeTime: baseOffset
          } as SimulationDriver;
        })
      );
    }
  }, []); // Only run once on mount

  // Every lap, ask the AI for a strategy update for the APX car
  useEffect(() => {
    if (!chaos.connected || timingData.length === 0 || currentLap >= 53) return;

    // Don't override an active crisis event with a generic strategy update
    if (["major_crash", "minor_crash", "tyre_failure", "rain", "heatwave"].includes(chaos.event)) {
      return;
    }

    const apxCar = timingData.find((d) => d.Abbreviation === "APX");
    if (apxCar) {
      const sample = weatherForLap(currentLap);
      const isRaining = chaos.weather.isRaining || sample.Rainfall;

      chaos.requestStrategy({
        event: "strategy_update",
        current_tire_age: apxCar.TyreLife,
        compound: apxCar.Compound,
        laps_left: 53 - currentLap,
        position: apxCar.Position,
        stint: apxCar.PitCount + 1,
        air_temp: Math.round(sample.AirTemp + chaos.weather.trackTempBoost * 0.5),
        track_temp: Math.round(sample.TrackTemp + chaos.weather.trackTempBoost),
        humidity: isRaining ? Math.min(95, sample.Humidity + 20) : sample.Humidity,
        rainfall: isRaining ? 1 : 0
      });
    }
  }, [currentLap, chaos.connected]);

  const prevLapRef = useRef(0);

  // Simulation Loop - strictly synchronized to the Master Clock (currentLap)
  useEffect(() => {
    if (timingData.length === 0 || currentLap <= 1 || currentLap === prevLapRef.current) {
      if (currentLap <= 1) prevLapRef.current = currentLap;
      return;
    }

    const lapsElapsed = currentLap - prevLapRef.current;
    prevLapRef.current = currentLap;

    setTimingData((prevData) => {
      let currentIterData = prevData;

      for (let lapTick = 0; lapTick < lapsElapsed; lapTick++) {
        // Track unique event triggers by the latest event ID
        const latestEvent = chaos.eventHistory[0];
        const isNewEvent = latestEvent && latestEvent.id !== lastEventIdRef.current;
        if (isNewEvent) {
          lastEventIdRef.current = latestEvent.id;

          if (["major_crash", "tyre_failure", "minor_crash", "penalty_5s"].includes(latestEvent.event)) {
            const activeOpponents = currentIterData.filter(d => d.Abbreviation !== "APX" && d.Status !== "OUT" && d.GapToLeader !== "DNF");
            if (activeOpponents.length > 0) {
              // Pick a true random victim once for this event
              const targetIndex = Math.floor(Math.random() * activeOpponents.length);
              currentVictimRef.current = activeOpponents[targetIndex].Abbreviation;
            }
          } else {
            // Clear the current victim for non-crash new events
            currentVictimRef.current = "";
          }
        }

        const updatedDrivers = currentIterData.map((d) => {
          if (d.Status === "OUT" || d.GapToLeader === "DNF") return d as SimulationDriver;

          // Safety check for null
          const prevLastLapTime = d.LastLapTime ?? 90.0;
          const prevBestLapTime = d.BestLapTime ?? 90.0;

          const trackStatus = trackStatusForLap(lapRef.current);
          const isYellow = trackStatus.Status >= 2;

          // Anchor pace realistically based on the driver's known baseline capabilities, not a flat 84.5
          // We use BestLapTime as their "Qualifying Pace" baseline. If missing, fallback to 84.5.
          const baseAnchor = d.BestLapTime && d.BestLapTime > 0 ? d.BestLapTime : 84.5;
          let newLapTime: number;

          if (isYellow) {
            // Yellow flag: all cars run at a uniform slow pace, no variance → no overtaking
            newLapTime = baseAnchor + 12;
          } else {
            // True Dataset Racing: No massive random rubber-banding.
            // Cars drive exactly at their capability + standard race pace delta (+1.2s avg) + micro-variance
            const microVariance = (Math.random() * 0.1) - 0.05; // +/- 0.05s
            const standardRaceDelta = 1.2;
            newLapTime = baseAnchor + standardRaceDelta + microVariance;

            // Add tire degradation delta based on compound and age
            let degMultiplier = 0.04;
            let compoundDelta = 0;
            if (d.Compound === "SOFT") { degMultiplier = 0.08; compoundDelta = 0.0; }
            if (d.Compound === "MEDIUM") { degMultiplier = 0.04; compoundDelta = 0.4; }
            if (d.Compound === "HARD") { degMultiplier = 0.02; compoundDelta = 0.9; }

            newLapTime += (d.TyreLife * degMultiplier) + compoundDelta;
          }

          const event = chaos.event;

          // 1. Check if this specific driver is the victim of a targeted chaos event
          if (d.Abbreviation === currentVictimRef.current) {
            if (event === "major_crash" || event === "tyre_failure") {
              return {
                ...d,
                Status: "OUT",
                GapToLeader: "DNF",
                IntervalToAhead: "-",
              } as SimulationDriver;
            } else if (event === "minor_crash") {
              newLapTime += 30; // Spin out delta
              currentVictimRef.current = ""; // Clear victim after penalty applied so it doesn't compound every tick
            } else if (event === "penalty_5s") {
              newLapTime += 5.0; // One-time 5-second track penalty
              currentVictimRef.current = "";
            }
          }

          // 2. Apply global environmental penalties
          if (event === "rain") {
            if (["SOFT", "MEDIUM", "HARD"].includes(d.Compound)) {
              newLapTime += 8;
            }
          } else if (event === "heatwave") {
            newLapTime += (d.TyreLife * 0.1); // Extra deg penalty
          } else if (event === "traffic") {
            if (d.Position >= 4 && d.Position <= 10) newLapTime += 0.5;
          }

          // 3. Pitting Logic
          let isPitting = false;
          let newCompound = d.Compound;

          const lapsRemaining = 53 - lapRef.current;
          // Never pit in the final 3 laps unless it's a hard puncture, because a pit stop costs 22.5s.
          // Over 3 laps, even terrible tires only lose ~10s, so pitting is mathematically a guaranteed position loss.
          const isLateRace = lapsRemaining <= 3;

          // ---- TRUE GLOBAL LOOKAHEAD ENGINE ----
          // Mathematically integrates remaining lap times to Lap 53 to find the absolute fastest total race time.
          const simulateRaceToFinish = (pitLapsFromNow: number, secondPitLapsFromNow: number = -1): number => {
            let totalTime = d.CumulativeTime;
            let simTyreLife = d.TyreLife;
            let simCompound = d.Compound;

            for (let i = 0; i < lapsRemaining; i++) {
              if (i === pitLapsFromNow || i === secondPitLapsFromNow) {
                totalTime += 22.5; // Standard Pit stop loss
                simTyreLife = 0;

                // Optimal compound selection for the remaining sprint
                const lapsLeftAfterPit = lapsRemaining - i;
                if (lapsLeftAfterPit <= 16) simCompound = "SOFT";
                else if (lapsLeftAfterPit <= 29) simCompound = "MEDIUM";
                else simCompound = "HARD";
              }

              // Calculate base lap time (no random variance in forward-sim)
              const baseAnchor = (d.BestLapTime ?? 0) > 0 ? d.BestLapTime! : 84.5;
              let lapTime = baseAnchor + 1.2;

              // Apply degradation deltas
              let degMultiplier = 0.04;
              let compoundDelta = 0;
              if (simCompound === "SOFT") { degMultiplier = 0.08; compoundDelta = 0.0; }
              if (simCompound === "MEDIUM") { degMultiplier = 0.04; compoundDelta = 0.4; }
              if (simCompound === "HARD") { degMultiplier = 0.02; compoundDelta = 0.9; }

              lapTime += (simTyreLife * degMultiplier) + compoundDelta;

              // Apply massive cliff drop-off if pushed beyond physical tire limits
              let limit = 40;
              if (simCompound === "SOFT") limit = 18;
              if (simCompound === "MEDIUM") limit = 35; // Stretched medium life from 28 to 35

              if (simTyreLife > limit) {
                // Lowered the drop-off severity to match real Italian GP wear
                lapTime += (simTyreLife - limit) * 0.8;
              }

              // Traffic penalty projection: If pitting drops our total time into the pack (behind slower cars)
              // simulate dirty air pace deficit so the engine prefers clean air.
              // We approximate this by adding a penalty if our projected average lap time is slower than the leader.
              if (i === pitLapsFromNow || i === secondPitLapsFromNow) {
                // The lap immediately emerging from pits is heavily punished by traffic backmarkers
                // Reduced from 1.5s to 0.5s to prevent the engine from being "too terrified" to pit
                lapTime += 0.5;
              }

              totalTime += lapTime;
              simTyreLife++;
            }
            return totalTime;
          };

          // Special logic for APX: Follow the LLM's Strategy Recommendation AND Perfect Natural Strategy
          if (d.Abbreviation === "APX") {
            const isRaining = chaos.event === "rain";

            // Priority 1: Deterministic Rain Check (slick tires melt in rain, must box)
            if (isRaining && ["SOFT", "MEDIUM", "HARD"].includes(d.Compound)) {
              isPitting = true;
              newCompound = "INTERMEDIATE";
            } else {
              // Priority 2: Global Lookahead Engine + Opponent Awareness
              let bestTime = simulateRaceToFinish(-1); // Baseline: Do not pit
              let bestPitLap = -1;
              let isTwoStopOptimal = false;

              // Execute forward projection into the future to find the absolute min-time strategy
              if (!isLateRace && d.TyreLife > 1) {
                // UNBOUNDED LOOKAHEAD: Test a pit stop on every single remaining lap of the race
                for (let i = 0; i <= lapsRemaining - 1; i++) {
                  // Test 1-Stop
                  const simTime1 = simulateRaceToFinish(i);
                  // Aggressive threshold: If the math saves even 0.1s over the entire race, take it
                  if (simTime1 < bestTime - 0.1) {
                    bestTime = simTime1;
                    bestPitLap = i;
                    isTwoStopOptimal = false;
                  }

                  // Test 2-Stop (Iterate every possible combination of second-stop stints)
                  if (i <= lapsRemaining - 20) {
                    for (let j = i + 15; j < lapsRemaining - 5; j++) {
                      const simTime2 = simulateRaceToFinish(i, j);
                      // 2-stop carries traffic risk, but we lowered the threshold to 0.2s advantage
                      if (simTime2 < bestTime - 0.2) {
                        bestTime = simTime2;
                        bestPitLap = i;
                        isTwoStopOptimal = true;
                      }
                    }
                  }
                }
              }

              // ---- OPPONENT AWARENESS ENGINE ----
              const carAhead = prevData.find(x => x.Position === d.Position - 1 && x.Status !== "OUT");
              const carBehind = prevData.find(x => x.Position === d.Position + 1 && x.Status !== "OUT");

              const gapToAhead = carAhead ? d.CumulativeTime - carAhead.CumulativeTime : 999;
              const gapToBehind = carBehind ? carBehind.CumulativeTime - d.CumulativeTime : 999;

              let isUndercutting = false;
              let isCoveringOff = false;

              // UNDERCUT: If stuck $< 1.0s behind (in dirty air losing time) AND our engine mathematically proves
              // we should pit anyway in the next 4 laps, box immediately for fresh tires to leapfrog them.
              if (carAhead && gapToAhead < 1.0 && bestPitLap > 0 && bestPitLap <= 4 && !isLateRace) {
                isUndercutting = true;
              }

              // COVER OFF: If the car behind is very close (< 2.5s) and they literally just pitted, we must pit to defend 
              // track position BEFORE their fresh tires close the gap, but ONLY if we haven't already pitted recently.
              if (carBehind && gapToBehind < 2.5 && carBehind.TyreLife <= 2 && carBehind.PitCount > d.PitCount && !isLateRace) {
                isCoveringOff = true;
              }

              // Opportunistic cheap pit stops under VSC/SC (loss time is reduced, so engine threshold is wider)
              const cheapPitWindow = (event === "major_crash" || event === "minor_crash") && (bestPitLap !== -1 && bestPitLap <= 8);

              // Execute pit based strictly on real-time matrix, eliminating dumb arbitrary 2-stops
              if (bestPitLap === 0 || isUndercutting || isCoveringOff || cheapPitWindow) {
                isPitting = true;

                // Lock in the best compound to the end dynamically based on laps remaining
                if (isTwoStopOptimal) {
                  newCompound = "SOFT"; // Absolute sprint pace since we know we're stopping again
                } else {
                  if (lapsRemaining <= 16) newCompound = "SOFT";
                  else if (lapsRemaining <= 29) newCompound = "MEDIUM";
                  else newCompound = "HARD";
                }
              }
            }
            // Logic for the other 19 ghost cars (Bots)
          } else {
            if (event === "rain" && ["SOFT", "MEDIUM", "HARD"].includes(d.Compound) && !isLateRace) {
              // Everyone boxes for inters during heavy rain
              isPitting = true;
              newCompound = "INTERMEDIATE";
            } else {
              // Natural pit thresholds
              let degLimit = 40; // Hard
              if (d.Compound === "SOFT") degLimit = 18;
              else if (d.Compound === "MEDIUM") degLimit = 28;

              // Random chance to pit if they exceed their tire's natural life limit
              if (d.TyreLife > degLimit && Math.random() > 0.4 && !isLateRace) {
                isPitting = true;
                newCompound = "HARD"; // Default to hard for final stint
              }

              // Strategic cheap pit stops under Safety Car
              if ((event === "major_crash" || event === "minor_crash") && d.TyreLife > degLimit - 10 && !isLateRace) {
                if (Math.random() > 0.5) {
                  isPitting = true;
                  newCompound = "HARD";
                }
              }
            }
          }

          if (isPitting) {
            newLapTime += 22.5; // Average pit stop loss time
          }

          // Generate new LastLapTime and BestLapTime
          const bestLap = Math.min(newLapTime, prevBestLapTime);

          // Add lap time to cumulative total
          const newCumulativeTime = d.CumulativeTime + newLapTime;

          return {
            ...d,
            LastLapTime: newLapTime,
            BestLapTime: bestLap,
            CumulativeTime: newCumulativeTime,
            TyreLife: isPitting ? 0 : d.TyreLife + 1,
            Compound: newCompound,
            PitCount: isPitting ? (typeof d.PitCount === 'number' ? d.PitCount + 1 : 2) : d.PitCount,
          } as SimulationDriver;
        });

        // Second pass: Sort active drivers by total time to resolve OVERTAKES
        const activeDrivers = updatedDrivers.filter(d => d.Status !== "OUT" && d.GapToLeader !== "DNF");
        const outDrivers = updatedDrivers.filter(d => d.Status === "OUT" || d.GapToLeader === "DNF");

        activeDrivers.sort((a, b) => a.CumulativeTime - b.CumulativeTime);

        // Third pass: Re-assign GAP and INT based on the newly sorted array
        const leaderTime = activeDrivers.length > 0 ? activeDrivers[0].CumulativeTime : 0;

        const fullyRanked = activeDrivers.map((d, index) => {
          const driver = { ...d };
          driver.Position = index + 1; // Update true grid position

          if (index === 0) {
            driver.GapToLeader = "LEADER";
            driver.IntervalToAhead = "-";
          } else {
            // Gap to leader
            const gap = driver.CumulativeTime - leaderTime;
            driver.GapToLeader = `+${gap.toFixed(3)}`;

            // Interval to car ahead
            const prevCar = activeDrivers[index - 1];
            const interval = driver.CumulativeTime - prevCar.CumulativeTime;
            driver.IntervalToAhead = `+${interval.toFixed(3)}`;
          }

          return driver as SimulationDriver;
        });

        const result = [...fullyRanked, ...outDrivers];

        // ---- GENERATE ORGANIC RACE EVENTS ----
        const emitEvent = (type: RaceEvent["type"], description: string) => {
          pendingEventsRef.current.push({
            id: Math.random().toString(36).slice(2),
            LapNumber: lapRef.current,
            Time: Date.now() / 1000,
            type,
            description,
          });
        };

        // Race Started (Lap 1 only)
        if (lapRef.current === 1 && prevData.length > 0) {
          emitEvent("flag", "LIGHTS OUT AND AWAY WE GO! Race started.");
        }

        // Race Finished (Lap 53)
        if (lapRef.current >= 53 && fullyRanked.length > 0) {
          emitEvent("flag", `CHEQUERED FLAG! ${fullyRanked[0].Abbreviation} wins the Italian Grand Prix!`);
        }

        // Detect Overtakes
        for (const driver of fullyRanked) {
          const prev = prevData.find((p: SimulationDriver) => p.Abbreviation === driver.Abbreviation);
          if (prev && prev.Position > driver.Position) {
            const overtaken = fullyRanked.find(d => d.Position === driver.Position + 1);
            if (overtaken) {
              emitEvent("overtake", `${driver.Abbreviation} overtakes ${overtaken.Abbreviation} for P${driver.Position}`);
            }
          }
        }

        // Detect Pit Stops
        for (const driver of result) {
          const prev = prevData.find((p: SimulationDriver) => p.Abbreviation === driver.Abbreviation);
          if (prev && driver.PitCount > prev.PitCount) {
            emitEvent("pit", `${driver.Abbreviation} pits for ${driver.Compound} tires (Stop ${driver.PitCount})`);
          }
        }

        // Detect Crashes / DNFs
        for (const driver of result) {
          const prev = prevData.find((p: SimulationDriver) => p.Abbreviation === driver.Abbreviation);
          if (prev && prev.Status !== "OUT" && driver.Status === "OUT") {
            emitEvent("incident", `${driver.Abbreviation} is OUT of the race! DNF.`);
          }
        }

        // Detect Chaos Events
        if (chaos.event && chaos.eventHistory.length > 0) {
          const latestChaos = chaos.eventHistory[0];
          if (latestChaos && !processedChaosRef.current.has(latestChaos.id)) {
            processedChaosRef.current.add(latestChaos.id);
            const label = latestChaos.event.toUpperCase().replace("_", " ");
            const eventType = ["rain", "heatwave"].includes(latestChaos.event) ? "weather" as const
              : ["minor_crash", "major_crash", "tyre_failure"].includes(latestChaos.event) ? "incident" as const
                : "flag" as const;
            emitEvent(eventType, `${label} — ${latestChaos.recommendation}`);
          }
        }

        // Queue notification for after render
        if (fullyRanked.length > 0) {
          pendingNotifyRef.current = { leader: fullyRanked[0], all: result };
        }

        currentIterData = result;
      }

      return currentIterData;
    });

  }, [currentLap, chaos.eventHistory, chaos.event, timingData.length]);

  // Fire the deferred notification AFTER the render completes
  useEffect(() => {
    if (pendingNotifyRef.current) {
      const { leader, all } = pendingNotifyRef.current;
      pendingNotifyRef.current = null;
      onLeaderChangeRef.current?.(leader, all);
    }
    // Emit pending race events
    if (pendingEventsRef.current.length > 0) {
      const events = [...pendingEventsRef.current];
      pendingEventsRef.current = [];
      events.forEach(e => onRaceEventRef.current?.(e));
    }
  }, [timingData]);

  return (
    <div className="apex-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="apex-label">LIVE TIMING</span>
        <div className="flex items-center gap-1">
          <div className={`h-1.5 w-1.5 rounded-full ${chaos.connected ? 'bg-apex-cyan' : 'bg-gray-600'} animate-pulse-glow`} />
          <span className={`apex-label ${chaos.connected ? 'text-apex-cyan' : 'text-gray-600'}`}>
            {chaos.connected ? 'LIVE' : 'STATIC'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[32px_48px_1fr_64px_64px_72px_72px_40px_40px] gap-0 text-[9px] text-gray-600 uppercase tracking-wider pb-1 border-b border-gray-800 px-1">
        <span>POS</span>
        <span></span>
        <span>DRIVER</span>
        <span className="text-right">GAP</span>
        <span className="text-right">INT</span>
        <span className="text-right">LAST</span>
        <span className="text-right">BEST</span>
        <span className="text-center">TIRE</span>
        <span className="text-center">PIT</span>
      </div>

      {/* Position list wrapper with smooth-scrolling items relative to their array position */}
      <div className="flex-1 overflow-y-auto w-full pr-1">
        {/* We map over them but use flex layout inside. For a quick visual swap without layout jump,
            flex directions preserve order. */}
        <div className="flex flex-col relative w-full pb-8">
          {timingData.map((d) => {
            const tireColor = TIRE_COLORS[d.Compound] ?? "#64748b";
            return (
              <div
                key={d.Abbreviation} // Key maintains identity so DOM nodes slide if animated
                className={`grid grid-cols-[32px_48px_1fr_64px_64px_72px_72px_40px_40px] gap-0 items-center py-1.5 px-1 border-b transition-colors ${d.Abbreviation === "APX"
                  ? "bg-[#FFD700]/10 border-[#FFD700]/40 hover:bg-[#FFD700]/20"
                  : "border-gray-800/30 hover:bg-white/[0.02]"
                  } ${d.Status === "OUT" ? "opacity-30" : ""}`}
              >
                <div className="flex justify-center items-center">
                  <span
                    className={`font-mono text-[11px] font-bold text-center flex items-center justify-center h-4 w-4 rounded-[2px] ${d.Position <= 3 ? (d.Position === 1 ? 'bg-apex-cyan text-black' : d.Position === 2 ? 'bg-gray-200 text-black' : 'bg-orange-500 text-black') : 'text-gray-500'}`}
                  >
                    {d.Position}
                  </span>
                </div>

                <div className="flex items-center">
                  <div
                    className="w-1 h-3.5 mr-2 rounded-sm"
                    style={{ backgroundColor: `#${d.TeamColor}` }}
                  />
                  <span className={`font-mono text-[11px] font-bold ${d.Abbreviation === "APX" ? "text-[#FFD700]" : "text-gray-100"}`}>
                    {d.Abbreviation}
                  </span>
                </div>

                <span className={`text-[10px] truncate lowercase font-light ${d.Abbreviation === "APX" ? "text-[#FFD700]/80" : "text-gray-500"}`} style={{ fontVariant: 'small-caps', letterSpacing: '0.05em' }}>
                  {d.FullName}
                </span>

                <span
                  className={`font-mono text-[11px] text-right ${d.GapToLeader === "LEADER"
                    ? "text-apex-cyan/90 font-bold"
                    : d.GapToLeader === "DNF"
                      ? "text-apex-red"
                      : "text-gray-300 transition-all duration-500"
                    }`}
                >
                  {d.GapToLeader}
                </span>

                <span className={`font-mono text-[10px] text-right ${parseFloat(d.IntervalToAhead.replace('+', '')) < 0.5 ? 'text-orange-400 font-bold' : 'text-gray-500'}`}>
                  {d.GapToLeader === "LEADER" ? "-" : d.IntervalToAhead}
                </span>

                <span className={`font-mono text-[11px] text-right transition-all duration-300 ${(d.LastLapTime ?? 0) > 100 ? "text-yellow-500/80" : "text-gray-300"}`}>
                  {formatLapTime(d.LastLapTime)}
                </span>

                <span className="font-mono text-[11px] text-right text-purple-400/80">
                  {formatLapTime(d.BestLapTime)}
                </span>

                <div className="flex justify-center items-center">
                  <div
                    className="w-3.5 h-3.5 flex items-center justify-center mr-1.5"
                    title={`${d.Compound} — TyreLife: ${d.TyreLife} laps`}
                  >
                    <div
                      className="w-3 h-3 rounded-full border-[1.5px]"
                      style={{
                        backgroundColor: tireColor + "22",
                        borderColor: tireColor,
                      }}
                    />
                  </div>
                  <span className={`font-mono text-[10px] w-3 text-left ${d.TyreLife > 20 ? 'text-red-400' : 'text-gray-400'}`}>
                    {d.TyreLife}
                  </span>
                </div>

                <span className="font-mono text-[10px] text-center text-gray-500">
                  {d.PitCount}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
