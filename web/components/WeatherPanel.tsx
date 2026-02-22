"use client";

import { useState, useEffect } from "react";
import { useChaos } from "@/lib/ChaosContext";
import { mockWeather, mockWeatherForecast } from "@/lib/mock-data";
import { degreesToCardinal } from "@/lib/format";

export default function WeatherPanel() {
  const chaos = useChaos();

  // State for live fluctuating data
  const [liveData, setLiveData] = useState({
    trackTempOffset: 0,
    airTempOffset: 0,
    windSpeedOffset: 0,
    humidityOffset: 0,
    pressureOffset: 0,
  });

  useEffect(() => {
    // Update weather slightly every second to simulate live sensor data
    const interval = setInterval(() => {
      setLiveData({
        trackTempOffset: (Math.random() * 0.8) - 0.4,
        airTempOffset: (Math.random() * 0.2) - 0.1,
        windSpeedOffset: (Math.random() * 1.5) - 0.75,
        humidityOffset: Math.floor(Math.random() * 3) - 1,
        pressureOffset: (Math.random() * 0.4) - 0.2,
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Apply chaos-driven weather overrides + live fluctuations
  const baseTrackRaw = mockWeather.TrackTemp + chaos.weather.trackTempBoost;
  const trackTemp = (baseTrackRaw + liveData.trackTempOffset).toFixed(1);

  const baseAirRaw = mockWeather.AirTemp + (chaos.weather.trackTempBoost * 0.5);
  const airTemp = (baseAirRaw + liveData.airTempOffset).toFixed(1);

  const isRaining = chaos.weather.isRaining || mockWeather.Rainfall;
  const baseHumidity = isRaining ? Math.min(95, mockWeather.Humidity + 20) : mockWeather.Humidity;
  const humidity = Math.max(0, Math.min(100, baseHumidity + liveData.humidityOffset));

  const windSpeed = Math.max(0, mockWeather.WindSpeed + liveData.windSpeedOffset).toFixed(1);
  const pressure = (mockWeather.Pressure + liveData.pressureOffset).toFixed(1);
  const windCardinal = degreesToCardinal(mockWeather.WindDirection);

  return (
    <div className="apex-card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="apex-label">WEATHER</span>
        <span className="text-base">{isRaining ? "🌧" : chaos.weather.trackTempBoost > 10 ? "🔥" : "⛅"}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-500">TRACK</span>
          <span className={`font-mono text-[11px] font-bold ${Number(trackTemp) > 50 ? 'text-apex-red' : 'text-apex-orange'}`}>
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
            {mockWeather.WindSpeed} m/s {windCardinal}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-500">PRESS</span>
          <span className="font-mono text-[11px] text-gray-300">
            {mockWeather.Pressure} hPa
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

      <div className="apex-label mt-1">FORECAST</div>
      <div className="flex flex-col gap-0.5">
        {mockWeatherForecast.map((f, i) => {
          const forecastRain = isRaining || f.Rainfall;
          const fTrack = Math.round(f.TrackTemp + chaos.weather.trackTempBoost);
          return (
            <div
              key={i}
              className="flex items-center justify-between text-[10px] py-0.5 border-b border-gray-800/50 last:border-0"
            >
              <span className="text-gray-500 font-mono">L{f.LapNumber}</span>
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
    </div>
  );
}
