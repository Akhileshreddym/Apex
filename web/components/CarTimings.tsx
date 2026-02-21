"use client";

import { useState, useEffect } from "react";
import { useChaos } from "@/lib/ChaosContext";
import { mockTimingData, TIRE_COLORS } from "@/lib/mock-data";
import { formatLapTime } from "@/lib/format";

// Extend TimingData with our internal tracking metrics
export type TimingDataRow = typeof mockTimingData[number];

interface SimulationDriver extends TimingDataRow {
  CumulativeTime: number;
}

export default function CarTimings() {
  const chaos = useChaos();

  // Initialize with initial standings and calculate base cumulative time
  const [timingData, setTimingData] = useState<SimulationDriver[]>(() => {
    return mockTimingData.map((d) => {
      // Parse the mock "GapToLeader" to create a baseline gap offset at the start
      let baseOffset = 0;
      if (d.GapToLeader !== "LEADER" && d.GapToLeader !== "DNF" && d.Status !== "OUT") {
        baseOffset = parseFloat(d.GapToLeader.replace("+", "")) || 0;
      }
      return {
        ...d,
        CumulativeTime: baseOffset // Start relative to leader acting as 0
      } as SimulationDriver;
    });
  });

  // Simulation Loop
  useEffect(() => {
    // Tick every 2.5 seconds (simulating sectors/laps)
    const interval = setInterval(() => {
      setTimingData((prevData) => {
        // First pass: Calculate new cumulative times for everyone
        const updatedDrivers = prevData.map((d) => {
          if (d.Status === "OUT" || d.GapToLeader === "DNF") return d as SimulationDriver;

          // Safety check for null
          const prevLastLapTime = d.LastLapTime ?? 90.0;
          const prevBestLapTime = d.BestLapTime ?? 90.0;

          // 1. Base Pace variation (± 0.4s) - Add a bit more variance to encourage overtakes
          const paceVariation = (Math.random() * 1.5) - 0.7;
          let newLapTime = prevLastLapTime + paceVariation;

          // 2. Apply Chaos Effects dynamically
          const event = chaos.event;

          if (event === "major_crash" || event === "minor_crash") {
            // Safety car bunches the pack - slower laps, but gaps compress down
            newLapTime += 15;
          } else if (event === "rain") {
            // Rain severely impacts slick tires - they lose huge amounts of time
            if (["SOFT", "MEDIUM", "HARD"].includes(d.Compound)) {
              newLapTime += 8; // HUGE penalty per tick
            }
          } else if (event === "traffic") {
            // DRS train bunches the midfield (cars 4-10 run a bit slower if they catch up)
            if (d.Position >= 4 && d.Position <= 10) newLapTime += 0.5;
          } else if (event === "penalty_5s" && d.Position === 1) {
            // Assume leader got penalty
            newLapTime += 2; // Simulate losing time
          }

          // Natural Tire Deg Penalty - Older tires get slower
          newLapTime += (d.TyreLife * 0.05);

          // Generate new LastLapTime and BestLapTime
          const bestLap = Math.min(newLapTime, prevBestLapTime);

          // Add lap time to cumulative total
          const newCumulativeTime = d.CumulativeTime + newLapTime;

          // Add a small chance of tyre life going up by 1 to simulate laps passing
          const isNewLap = Math.random() > 0.6;

          return {
            ...d,
            LastLapTime: newLapTime,
            BestLapTime: bestLap,
            CumulativeTime: newCumulativeTime,
            TyreLife: isNewLap ? d.TyreLife + 1 : d.TyreLife,
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

        return [...fullyRanked, ...outDrivers];
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [chaos.event]);

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
                className={`grid grid-cols-[32px_48px_1fr_64px_64px_72px_72px_40px_40px] gap-0 items-center py-1.5 px-1 border-b border-gray-800/30 hover:bg-white/[0.02] transition-colors ${d.Status === "OUT" ? "opacity-30" : ""
                  }`}
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
                  <span className="font-mono text-[11px] font-bold text-gray-100">
                    {d.Abbreviation}
                  </span>
                </div>

                <span className="text-[10px] text-gray-500 truncate lowercase font-light" style={{ fontVariant: 'small-caps', letterSpacing: '0.05em' }}>
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
