"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import timingData from "@/lib/timing_data.json";
import monzaData from "@/lib/monza.json";

/**
 * Normalise + ROTATE the Monza telemetry so the track is LANDSCAPE.
 * We swap X↔Y and negate the new-X so the chicanes face right.
 */
function normalizeTrack(points: { x: number; y: number }[]) {
  if (!points || points.length === 0) return [];

  // Rotate 90° clockwise: newX = oldY,  newY = -oldX
  const rotated = points.map(p => ({ x: p.y, y: -p.x }));

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const p of rotated) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const trackWidth = maxX - minX;
  const trackHeight = maxY - minY;

  // Target canvas logical size: 800x440, 30px margin
  const availW = 740;
  const availH = 380;
  const scale = Math.min(availW / trackWidth, availH / trackHeight);

  // Center the track in the canvas
  const scaledW = trackWidth * scale;
  const scaledH = trackHeight * scale;
  const offsetX = (800 - scaledW) / 2;
  const offsetY = (440 - scaledH) / 2;

  return rotated.map(p => ({
    x: (p.x - minX) * scale + offsetX,
    y: (p.y - minY) * scale + offsetY,
  }));
}

const RAW_POINTS = monzaData as { x: number; y: number }[];
const SUBSAMPLED = RAW_POINTS.filter((_, i) => i % 5 === 0);
const TRACK_POINTS = normalizeTrack(SUBSAMPLED);

interface CarState {
  trackIndex: number;
  speed: number;
  Abbreviation: string;
  TeamColor: string;
  DriverNumber: string;
  Position: number;
  isOut: boolean;
}

export default function TrackCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const carsRef = useRef<CarState[]>([]);
  const animRef = useRef<number>(0);
  const [currentLap, setCurrentLap] = useState(31);

  const initCars = useCallback(() => {
    const drivers = timingData as any[];
    carsRef.current = drivers.map((d: any, i: number) => ({
      trackIndex: (i * 20) % TRACK_POINTS.length,
      speed: d.Status === "OUT" ? 0 : 1.4 + Math.random() * 0.3 - i * 0.02,
      Abbreviation: d.Abbreviation,
      TeamColor: `#${d.TeamColor}`,
      DriverNumber: d.DriverNumber,
      Position: d.Position,
      isOut: d.Status === "OUT",
    }));
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const scaleX = w / 800;
    const scaleY = h / 440;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (w - 800 * scale) / 2;
    const offsetY = (h - 440 * scale) / 2;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Track border (dark)
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 28;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(TRACK_POINTS[0].x, TRACK_POINTS[0].y);
    for (let i = 1; i < TRACK_POINTS.length; i++) {
      ctx.lineTo(TRACK_POINTS[i].x, TRACK_POINTS[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Track surface (middle tone)
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(TRACK_POINTS[0].x, TRACK_POINTS[0].y);
    for (let i = 1; i < TRACK_POINTS.length; i++) {
      ctx.lineTo(TRACK_POINTS[i].x, TRACK_POINTS[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Center line
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.moveTo(TRACK_POINTS[0].x, TRACK_POINTS[0].y);
    for (let i = 1; i < TRACK_POINTS.length; i++) {
      ctx.lineTo(TRACK_POINTS[i].x, TRACK_POINTS[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Start/Finish line
    const sfPos = TRACK_POINTS[0];
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(sfPos.x - 18, sfPos.y - 2, 36, 4);
    ctx.font = "bold 9px JetBrains Mono, monospace";
    ctx.fillStyle = "#22d3ee";
    ctx.textAlign = "center";
    ctx.fillText("S/F", sfPos.x, sfPos.y - 10);

    // Cars
    for (const car of carsRef.current) {
      if (car.isOut) continue;

      const prevIndex = car.trackIndex;
      car.trackIndex = (car.trackIndex + car.speed) % TRACK_POINTS.length;

      if (car.Position === 1 && prevIndex > car.trackIndex && prevIndex > TRACK_POINTS.length - 50) {
        setCurrentLap((c) => Math.min(c + 1, 53));
      }

      if (car.trackIndex < 0) car.trackIndex += TRACK_POINTS.length;

      const idx = Math.floor(car.trackIndex);
      const pt = TRACK_POINTS[idx];

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = car.TeamColor;
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "bold 5px JetBrains Mono, monospace";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(car.DriverNumber, pt.x, pt.y);

      ctx.font = "bold 8px JetBrains Mono, monospace";
      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(car.Abbreviation, pt.x + 10, pt.y - 2);
    }

    ctx.restore();

    animRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    initCars();
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [initCars, render]);

  return (
    <div className="apex-card h-full relative overflow-hidden">
      <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-apex-cyan animate-pulse-glow" />
        <span className="apex-label">LIVE TRACK — ITALIAN GP</span>
      </div>
      <div className="absolute top-2 right-3 z-10">
        <span className="apex-label text-apex-cyan">LAP {currentLap} / 53</span>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
}
