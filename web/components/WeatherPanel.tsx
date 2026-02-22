"use client";

import { useChaos } from "@/lib/ChaosContext";
import { weatherForLap, weatherForecastForLap } from "@/lib/mock-data";
import { degreesToCardinal } from "@/lib/format";

interface WeatherPanelProps {
  currentLap?: number;
}

export default function WeatherPanel({ currentLap = 31 }: WeatherPanelProps) {
  const chaos = useChaos();

  const sample = weatherForLap(currentLap);
  const forecast = weatherForecastForLap(currentLap, 4);

  const trackTemp = Math.round(sample.TrackTemp + chaos.weather.trackTempBoost);
  const airTemp = Math.round(sample.AirTemp + chaos.weather.trackTempBoost * 0.5);
  const isRaining = chaos.weather.isRaining || sample.Rainfall;
  const humidity = isRaining ? Math.min(95, sample.Humidity + 20) : sample.Humidity;
  const windCardinal = degreesToCardinal(sample.WindDirection);

  return (
    <div className="apex-card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="apex-label">WEATHER</span>
        <span className="text-base">{isRaining ? "🌧" : chaos.weather.trackTempBoost > 10 ? "🔥" : "⛅"}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-500">TRACK</span>
          <span className={`font-mono text-[11px] font-bold ${trackTemp > 50 ? 'text-apex-red' : 'text-apex-orange'}`}>
            {trackTemp}°C
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-500">AIR</span>
          <span className="font-mono text-[11px] text-gray-300">
            {airTemp}°C
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-500">HUMID</span>
          <span className="font-mono text-[11px] text-gray-300">
            {humidity}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-500">WIND</span>
          <span className="font-mono text-[11px] text-gray-300">
            {sample.WindSpeed} m/s {windCardinal}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-500">PRESS</span>
          <span className="font-mono text-[11px] text-gray-300">
            {sample.Pressure} hPa
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-500">RAIN</span>
          <span
            className="font-mono text-[11px] font-bold"
            style={{ color: isRaining ? "#ef4444" : "#22c55e" }}
          >
            {isRaining ? "YES" : "NO"}
          </span>
        </div>
      </div>

      {forecast.length > 0 && (
        <>
          <div className="apex-label mt-1">FORECAST</div>
          <div className="flex flex-col gap-0.5">
            {forecast.map((f, i) => {
              const forecastRain = isRaining || f.Rainfall;
              const fTrack = Math.round(f.TrackTemp + chaos.weather.trackTempBoost);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between text-[10px] py-0.5 border-b border-gray-800/50 last:border-0"
                >
                  <span className="text-gray-500 font-mono">L{f.ForecastLap}</span>
                  <span className="text-gray-400 flex items-center gap-1">
                    {forecastRain ? "🌧" : "⛅"} {fTrack}°C
                  </span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: forecastRain ? "#ef4444" : "#22c55e" }}
                  >
                    {forecastRain ? "RAIN" : "DRY"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
