"use client";

import { mockWeather, mockWeatherForecast } from "@/lib/mock-data";
import { degreesToCardinal } from "@/lib/format";

export default function WeatherPanel() {
  const w = mockWeather;
  const windCardinal = degreesToCardinal(w.WindDirection);

  return (
    <div className="apex-card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="apex-label">WEATHER</span>
        <span className="text-base">{w.Rainfall ? "🌧" : "⛅"}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-500">TRACK</span>
          <span className="font-mono text-[11px] text-apex-orange">
            {w.TrackTemp}°C
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-500">AIR</span>
          <span className="font-mono text-[11px] text-gray-300">
            {w.AirTemp}°C
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-500">HUMID</span>
          <span className="font-mono text-[11px] text-gray-300">
            {w.Humidity}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-500">WIND</span>
          <span className="font-mono text-[11px] text-gray-300">
            {w.WindSpeed} m/s {windCardinal}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-500">PRESS</span>
          <span className="font-mono text-[11px] text-gray-300">
            {w.Pressure} hPa
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-500">RAIN</span>
          <span
            className="font-mono text-[11px] font-bold"
            style={{ color: w.Rainfall ? "#ef4444" : "#22c55e" }}
          >
            {w.Rainfall ? "YES" : "NO"}
          </span>
        </div>
      </div>

      <div className="apex-label mt-1">FORECAST</div>
      <div className="flex flex-col gap-0.5">
        {mockWeatherForecast.map((f, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-[10px] py-0.5 border-b border-gray-800/50 last:border-0"
          >
            <span className="text-gray-500 font-mono">L{f.LapNumber}</span>
            <span className="text-gray-400 flex items-center gap-1">
              {f.Rainfall ? "🌧" : "⛅"} {f.TrackTemp}°C
            </span>
            <span
              className="font-mono font-bold"
              style={{ color: f.Rainfall ? "#ef4444" : "#22c55e" }}
            >
              {f.Rainfall ? "RAIN" : "DRY"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
