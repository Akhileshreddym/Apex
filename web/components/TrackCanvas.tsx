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

interface TrackCanvasProps {
  onLapChange?: (lap: number) => void;
}

export default function TrackCanvas({ onLapChange }: TrackCanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const carsRef = useRef<CarState[]>([]);
  const animRef = useRef<number>(0);
  const currentLapRef = useRef<number>(31);
  const [currentLap, setCurrentLap] = useState(31);
  const onLapChangeRef = useRef(onLapChange);
  useEffect(() => { onLapChangeRef.current = onLapChange; }, [onLapChange]);

  const initCars = useCallback(() => {
    const drivers = timingData as any[];
    // Target ~4.1 seconds per lap (90 seconds / 22 laps left). At 60fps, that's 246 frames.
    const baseSpeed = TRACK_POINTS.length / 246;

    carsRef.current = drivers.map((d: any, i: number) => ({
      trackIndex: (i * 20) % TRACK_POINTS.length,
      speed: d.Status === "OUT" ? 0 : baseSpeed + Math.random() * (baseSpeed * 0.1) - i * (baseSpeed * 0.01),
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

    // Calculate the angle of the track at S/F line to rotate the drawing properly
    const nextPos = TRACK_POINTS[1];
    const angle = Math.atan2(nextPos.y - sfPos.y, nextPos.x - sfPos.x);

    ctx.save();
    ctx.translate(sfPos.x, sfPos.y);
    ctx.rotate(angle);

    // Draw the line perfectly perpendicular to the track direction
    ctx.fillStyle = "#22d3ee";
    // x is along track direction, y is across. We want the line across the track.
    ctx.fillRect(-2, -18, 4, 36);

    // Draw the "S/F" text
    ctx.rotate(-angle); // unrotate text so it stays upright
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#22d3ee";
    ctx.textAlign = "center";
    ctx.fillText("S/F", 0, -22);

    ctx.restore();
    for (const car of carsRef.current) {
      if (car.isOut) continue;

      const prevIndex = car.trackIndex;

      // Moving logic
      if (currentLapRef.current < 53) {
        // Normal racing
        car.trackIndex = (car.trackIndex + car.speed) % TRACK_POINTS.length;
      } else {
        // We are on lap 53. Cars still racing should drive until they hit the line.
        // The line is essentially index 0 (or crossing from high trackIndex to low).
        if (car.speed > 0) { // If they haven't finished yet
          car.trackIndex = (car.trackIndex + car.speed) % TRACK_POINTS.length;

          // Did they just cross the finish line?
          if (prevIndex > car.trackIndex && prevIndex > TRACK_POINTS.length - 50) {
            car.trackIndex = 0; // Snap exactly to the start/finish line
            car.speed = 0; // Stop moving permanently
          }
        }
      }

      // Leader lap counter update
      if (car.Position === 1 && prevIndex > car.trackIndex && prevIndex > TRACK_POINTS.length - 50) {
        if (currentLapRef.current < 53) {
          currentLapRef.current += 1;
          setCurrentLap(currentLapRef.current);
          onLapChangeRef.current?.(currentLapRef.current);
        }
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

      ctx.font = "bold 5px monospace";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(car.DriverNumber, pt.x, pt.y);

      ctx.font = "bold 8px monospace";
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
