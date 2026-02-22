"use client";

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
      TeamColor: `#${d.TeamColor}`,
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

    // Gradient background
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.7);
    bgGrad.addColorStop(0, '#0e1525');
    bgGrad.addColorStop(0.6, '#090d17');
    bgGrad.addColorStop(1, '#050810');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const trackStatus = trackStatusForLap(currentLapRef.current);
    const isYellow = trackStatus.Status >= 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // --- Track glow (outer atmospheric glow) ---
    ctx.strokeStyle = isYellow ? 'rgba(234,179,8,0.2)' : 'rgba(34,211,238,0.06)';
    ctx.lineWidth = 50;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(TRACK_POINTS[0].x, TRACK_POINTS[0].y);
    for (let i = 1; i < TRACK_POINTS.length; i++) ctx.lineTo(TRACK_POINTS[i].x, TRACK_POINTS[i].y);
    ctx.closePath();
    ctx.stroke();

    // --- Extra yellow glow layer during caution ---
    if (isYellow) {
      ctx.strokeStyle = 'rgba(250,204,21,0.08)';
      ctx.lineWidth = 80;
      ctx.beginPath();
      ctx.moveTo(TRACK_POINTS[0].x, TRACK_POINTS[0].y);
      for (let i = 1; i < TRACK_POINTS.length; i++) ctx.lineTo(TRACK_POINTS[i].x, TRACK_POINTS[i].y);
      ctx.closePath();
      ctx.stroke();
    }

    // --- Track border (runoff area) ---
    ctx.strokeStyle = isYellow ? '#92400e' : '#1a2236';
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.moveTo(TRACK_POINTS[0].x, TRACK_POINTS[0].y);
    for (let i = 1; i < TRACK_POINTS.length; i++) ctx.lineTo(TRACK_POINTS[i].x, TRACK_POINTS[i].y);
    ctx.closePath();
    ctx.stroke();

    // --- Track surface (asphalt) ---
    ctx.strokeStyle = isYellow ? '#78350f' : '#2a3548';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(TRACK_POINTS[0].x, TRACK_POINTS[0].y);
    for (let i = 1; i < TRACK_POINTS.length; i++) ctx.lineTo(TRACK_POINTS[i].x, TRACK_POINTS[i].y);
    ctx.closePath();
    ctx.stroke();

    // --- Inner track edge highlight ---
    ctx.strokeStyle = isYellow ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(TRACK_POINTS[0].x, TRACK_POINTS[0].y);
    for (let i = 1; i < TRACK_POINTS.length; i++) ctx.lineTo(TRACK_POINTS[i].x, TRACK_POINTS[i].y);
    ctx.closePath();
    ctx.stroke();

    // --- Center line (dashed) ---
    ctx.strokeStyle = isYellow ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = isYellow ? 1.5 : 1;
    ctx.setLineDash([6, 14]);
    ctx.beginPath();
    ctx.moveTo(TRACK_POINTS[0].x, TRACK_POINTS[0].y);
    for (let i = 1; i < TRACK_POINTS.length; i++) ctx.lineTo(TRACK_POINTS[i].x, TRACK_POINTS[i].y);
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

      // Car shadow
      ctx.beginPath();
      ctx.arc(pt.x + 1, pt.y + 1, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fill();

      // Car glow
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 12, 0, Math.PI * 2);
      const glowAlpha = car.Position === 1 ? 0.25 : 0.1;
      ctx.fillStyle = car.TeamColor.replace(')', `,${glowAlpha})`).replace('rgb', 'rgba').replace('#', '');
      // Manual hex to glow
      ctx.fillStyle = `${car.TeamColor}${Math.round(glowAlpha * 255).toString(16).padStart(2, '0')}`;
      ctx.fill();

      // Car body circle
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = car.TeamColor;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner highlight
      ctx.beginPath();
      ctx.arc(pt.x - 1, pt.y - 1, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();

      // Driver number text
      ctx.font = 'bold 5px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(car.DriverNumber, pt.x, pt.y);

      // Abbreviation label
      ctx.font = 'bold 8px sans-serif';
      ctx.fillStyle = 'rgba(226,232,240,0.85)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      // Text shadow
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(car.Abbreviation, pt.x + 11, pt.y - 1);
      ctx.fillStyle = 'rgba(226,232,240,0.85)';
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

  const trackStatus = trackStatusForLap(currentLap);
  const isYellowFlag = trackStatus.Status >= 2;

  return (
    <div className="apex-card h-full relative overflow-hidden">
      <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${isYellowFlag ? 'bg-yellow-500' : 'bg-apex-cyan'} animate-pulse-glow`} />
        <span className="apex-label">LIVE TRACK — ITALIAN GP</span>
        {isYellowFlag && (
          <span className="text-[9px] font-bold text-yellow-400 bg-yellow-500/15 border border-yellow-500/30 px-1.5 py-0.5 animate-pulse">
            YELLOW FLAG
          </span>
        )}
      </div>
      <div className="absolute top-2 right-3 z-10 flex items-center gap-2">
        <span className={`text-[10px] font-mono font-bold ${isYellowFlag ? 'text-yellow-400' : 'text-cyan-400/70'}`}>LAP {currentLap} / 53</span>
        {!isYellowFlag && <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">WS:LIVE</span>}
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
}
