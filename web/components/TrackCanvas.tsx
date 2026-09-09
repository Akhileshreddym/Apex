"use client";

import { instrumentColor } from "@/lib/display-colors";

import { useRef, useEffect, useCallback, useState } from "react";
import timingData from "@/lib/timing_data.json";
import monzaData from "@/lib/monza.json";
import { trackStatusForLap } from "@/lib/mock-data";

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
const TRACK_POINTS = normalizeTrack(RAW_POINTS);

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
  playbackSpeed?: number;
}

export default function TrackCanvas({ onLapChange, playbackSpeed = 1 }: TrackCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const carsRef = useRef<CarState[]>([]);
  const animRef = useRef<number>(0);
  const currentLapRef = useRef<number>(1);
  const [currentLap, setCurrentLap] = useState(1);
  const onLapChangeRef = useRef(onLapChange);
  useEffect(() => { onLapChangeRef.current = onLapChange; }, [onLapChange]);

  const playbackSpeedRef = useRef(playbackSpeed);
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);

  const initCars = useCallback(() => {
    const drivers = timingData as any[];
    // Target 85.0s per lap real time. 85000 milliseconds.
    const baseSpeed = TRACK_POINTS.length / 85000;

    carsRef.current = drivers.map((d: any, i: number) => ({
      trackIndex: (i * 20) % TRACK_POINTS.length,
      speed: d.Status === "OUT" ? 0 : baseSpeed + Math.random() * (baseSpeed * 0.1) - i * (baseSpeed * 0.01),
      Abbreviation: d.Abbreviation,
      TeamColor: instrumentColor(`#${d.TeamColor}`),
      DriverNumber: d.DriverNumber,
      Position: d.Position,
      isOut: d.Status === "OUT",
    }));
  }, []);

  const lastTimeRef = useRef<number>(0);

  const render = useCallback((time: number) => {
    const dt = lastTimeRef.current ? time - lastTimeRef.current : 16.66;
    lastTimeRef.current = time;

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

    // A restrained plotting grid gives the circuit a telemetry-display treatment.
    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(170, 175, 180, 0.018)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0.5; x < w; x += 28) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0.5; y < h; y += 28) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    const trackStatus = trackStatusForLap(currentLapRef.current);
    const isYellow = trackStatus.Status >= 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const circuitPath = new Path2D();
    circuitPath.moveTo(TRACK_POINTS[0].x, TRACK_POINTS[0].y);
    for (let i = 1; i < TRACK_POINTS.length; i++) {
      circuitPath.lineTo(TRACK_POINTS[i].x, TRACK_POINTS[i].y);
    }
    circuitPath.closePath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fine double edges retain the circuit silhouette at compact sizes.
    ctx.strokeStyle = isYellow ? '#6b582b' : '#60666c';
    ctx.lineWidth = 17;
    ctx.stroke(circuitPath);
    ctx.strokeStyle = isYellow ? '#28251c' : '#242424';
    ctx.lineWidth = 13;
    ctx.stroke(circuitPath);
    ctx.strokeStyle = isYellow ? '#ad9143' : '#8aabc6';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 9]);
    ctx.stroke(circuitPath);
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
    ctx.fillStyle = "#c1c6c1";
    // x is along track direction, y is across. We want the line across the track.
    ctx.fillRect(-2, -12, 4, 24);

    // Draw the "S/F" text
    ctx.rotate(-angle); // unrotate text so it stays upright
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#c1c6c1";
    ctx.textAlign = "center";
    ctx.fillText("START / FINISH", 0, -19);

    ctx.restore();
    const labelBoxes: { x: number; y: number; w: number; h: number }[] = [];
    const unit = 1 / Math.max(scale, 0.45);
    for (const car of carsRef.current) {
      if (car.isOut) continue;

      // Moving logic — slow down during yellow flag, scale by playbackSpeed
      const effectiveSpeed = isYellow ? car.speed * 0.6 : car.speed;
      const moveDist = effectiveSpeed * playbackSpeedRef.current * dt;
      const nextIndex = car.trackIndex + moveDist;
      const lapsCrossed = Math.floor(nextIndex / TRACK_POINTS.length);

      if (car.speed > 0) {
        car.trackIndex = nextIndex % TRACK_POINTS.length;
      }

      // Leader lap counter update
      if (car.Position === 1 && lapsCrossed > 0) {
        if (currentLapRef.current < 53) {
          // Handle mega-skip speeds by jumping multiple laps reliably
          currentLapRef.current = Math.min(53, currentLapRef.current + lapsCrossed);
          setCurrentLap(currentLapRef.current);
          onLapChangeRef.current?.(currentLapRef.current);
        }
      }

      // Stop cars gracefully once leader hits Lap 53 and they cross the finish line
      if (currentLapRef.current >= 53 && car.speed > 0 && lapsCrossed > 0) {
        car.speed = 0;
        car.trackIndex = 0;
      }

      if (car.trackIndex < 0) car.trackIndex += TRACK_POINTS.length;

      const idx = Math.floor(car.trackIndex);
      const pt = TRACK_POINTS[idx];

      // Team-coloured position markers, with a fine leader ring.
      if (car.Position === 1) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7 * unit, 0, Math.PI * 2);
        ctx.strokeStyle = '#e1edee';
        ctx.lineWidth = unit;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4 * unit, 0, Math.PI * 2);
      ctx.fillStyle = car.TeamColor;
      ctx.fill();
      ctx.strokeStyle = '#101010';
      ctx.lineWidth = 1.5 * unit;
      ctx.stroke();

      // Place readable labels around traffic; suppress only overlapping labels.
      ctx.font = `600 ${9 * unit}px ui-monospace, SFMono-Regular, monospace`;
      const labelW = ctx.measureText(car.Abbreviation).width + 8 * unit;
      const labelH = 15 * unit;
      const candidates = [
        { x: pt.x + 8 * unit, y: pt.y - 17 * unit },
        { x: pt.x + 8 * unit, y: pt.y + 3 * unit },
        { x: pt.x - labelW - 8 * unit, y: pt.y - 17 * unit },
        { x: pt.x - labelW - 8 * unit, y: pt.y + 3 * unit },
      ];
      const label = candidates.find(candidate =>
        candidate.x >= 0 && candidate.x + labelW <= 800 &&
        candidate.y >= 24 && candidate.y + labelH <= 418 &&
        !labelBoxes.some(box =>
          candidate.x < box.x + box.w + 2 * unit && candidate.x + labelW + 2 * unit > box.x &&
          candidate.y < box.y + box.h + 2 * unit && candidate.y + labelH + 2 * unit > box.y
        )
      );
      if (label) {
        labelBoxes.push({ ...label, w: labelW, h: labelH });
        ctx.fillStyle = 'rgba(16, 16, 16, 0.94)';
        ctx.fillRect(label.x, label.y, labelW, labelH);
        ctx.fillStyle = car.TeamColor;
        ctx.fillRect(label.x, label.y + 3 * unit, 1.5 * unit, 9 * unit);
        ctx.fillStyle = car.Position === 1 ? '#ffffff' : '#c5d0d9';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(car.Abbreviation, label.x + 5 * unit, label.y + labelH / 2);
      }
    }

    ctx.restore();

    animRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    initCars();
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [initCars, render]);

  const trackStatus = trackStatusForLap(currentLap);
  const isYellowFlag = trackStatus.Status >= 2;

  return (
    <div className="apex-card h-full min-h-0 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 border-b border-white/[0.06] bg-[#101010]/90 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isYellowFlag ? 'bg-yellow-400' : 'bg-[#7fae97]'}`} />
          <span className="truncate text-[10px] font-semibold tracking-[0.14em] text-slate-300">CIRCUIT POSITION</span>
        </div>
        <span className={`shrink-0 font-mono text-[10px] ${isYellowFlag ? 'text-yellow-400' : 'text-slate-400'}`}>
          {isYellowFlag ? 'YELLOW FLAG' : 'TRACK CLEAR'}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
        role="img"
        aria-label={`Simulated driver positions at Monza, lap ${currentLap} of 53`}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-[#101010] to-transparent px-3 pb-2 pt-4">
        <div className="flex items-center gap-2 font-mono text-[9px] tracking-wider text-slate-500">
          <span className=" text-slate-300">MONZA</span>
          <span>5.793 KM</span>
        </div>
        <span className="font-mono text-[9px] tracking-wider text-slate-500">LAP <span className="text-slate-200">{String(currentLap).padStart(2, '0')}</span> / 53</span>
      </div>
    </div>
  );
}
