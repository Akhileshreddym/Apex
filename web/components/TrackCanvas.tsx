"use client";

import { useRef, useEffect, useCallback } from "react";
import { mockTimingData } from "@/lib/mock-data";

/**
 * In production this would be populated from FastF1 telemetry X/Y data:
 *   lap.get_pos_data() → columns X, Y (units: 1/10 m)
 * For now we generate a Catmull-Rom spline as a placeholder track shape.
 */
const TRACK_POINTS = generateTrackSpline();

function generateTrackSpline(): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const cx = 400,
    cy = 220;

  const controlPoints = [
    { x: cx + 180, y: cy - 120 },
    { x: cx + 220, y: cy - 60 },
    { x: cx + 200, y: cy + 20 },
    { x: cx + 160, y: cy + 80 },
    { x: cx + 100, y: cy + 130 },
    { x: cx + 20, y: cy + 140 },
    { x: cx - 80, y: cy + 120 },
    { x: cx - 160, y: cy + 80 },
    { x: cx - 210, y: cy + 20 },
    { x: cx - 200, y: cy - 40 },
    { x: cx - 160, y: cy - 100 },
    { x: cx - 80, y: cy - 130 },
    { x: cx + 20, y: cy - 140 },
    { x: cx + 100, y: cy - 140 },
  ];

  const n = controlPoints.length;
  const totalSteps = 300;

  for (let i = 0; i < totalSteps; i++) {
    const t = i / totalSteps;
    const segment = t * n;
    const idx = Math.floor(segment) % n;
    const localT = segment - Math.floor(segment);

    const p0 = controlPoints[(idx - 1 + n) % n];
    const p1 = controlPoints[idx];
    const p2 = controlPoints[(idx + 1) % n];
    const p3 = controlPoints[(idx + 2) % n];

    const tt = localT * localT;
    const ttt = tt * localT;

    const x =
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * localT +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * ttt);

    const y =
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * localT +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tt +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * ttt);

    points.push({ x, y });
  }

  return points;
}

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

  const initCars = useCallback(() => {
    carsRef.current = mockTimingData.map((d, i) => ({
      trackIndex: (i * 15) % TRACK_POINTS.length,
      speed: d.Status === "OUT" ? 0 : 1.2 + Math.random() * 0.4 - i * 0.015,
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

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(TRACK_POINTS[0].x, TRACK_POINTS[0].y);
    for (let i = 1; i < TRACK_POINTS.length; i++) {
      ctx.lineTo(TRACK_POINTS[i].x, TRACK_POINTS[i].y);
    }
    ctx.closePath();
    ctx.stroke();

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

    const sfPos = TRACK_POINTS[0];
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(sfPos.x - 2, sfPos.y - 18, 4, 36);
    ctx.font = "bold 9px JetBrains Mono, monospace";
    ctx.fillStyle = "#22d3ee";
    ctx.fillText("S/F", sfPos.x + 8, sfPos.y - 10);

    for (const car of carsRef.current) {
      if (car.isOut) continue;

      car.trackIndex =
        (car.trackIndex + car.speed) % TRACK_POINTS.length;
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
        <span className="apex-label">LIVE TRACK — SILVERSTONE GP</span>
      </div>
      <div className="absolute top-2 right-3 z-10">
        <span className="apex-label text-apex-cyan">LAP 31 / 56</span>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
}
