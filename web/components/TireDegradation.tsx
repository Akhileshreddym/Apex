"use client";

import { useRef, useEffect, useCallback } from "react";
import { useChaos } from "@/lib/ChaosContext";
import { mockTireDeg } from "@/lib/mock-data";

const CLIFF_THRESHOLD = 30;
const WARNING_THRESHOLD = 50;

export default function TireDegradation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chaos = useChaos();

  const draw = useCallback(() => {
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
    const pad = { top: 8, right: 8, bottom: 18, left: 28 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
    }

    // Cliff zone
    ctx.fillStyle = "#ef444433";
    ctx.fillRect(
      pad.left,
      pad.top + plotH * (1 - CLIFF_THRESHOLD / 100),
      plotW,
      plotH * (CLIFF_THRESHOLD / 100)
    );

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    const cliffY = pad.top + plotH * (1 - CLIFF_THRESHOLD / 100);
    ctx.beginPath();
    ctx.moveTo(pad.left, cliffY);
    ctx.lineTo(w - pad.right, cliffY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = "8px JetBrains Mono, monospace";
    ctx.fillStyle = "#ef4444";
    ctx.textAlign = "left";
    ctx.fillText("CLIFF", pad.left + 2, cliffY - 2);

    // Apply chaos tire degradation multiplier
    const degMultiplier = chaos.tireDegRate;
    const adjustedData = mockTireDeg.map((d) => ({
      ...d,
      DegPct: Math.max(0, d.DegPct - (degMultiplier - 1) * (d.TyreLife * 4)),
    }));

    const xScale = plotW / (adjustedData.length - 1);

    // Fill
    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
    const isUrgent = chaos.tireDegRate > 1.5;
    gradient.addColorStop(0, isUrgent ? "#ef444433" : "#22d3ee33");
    gradient.addColorStop(1, isUrgent ? "#ef444400" : "#22d3ee00");

    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + plotH);
    adjustedData.forEach((d, i) => {
      const x = pad.left + i * xScale;
      const y = pad.top + plotH * (1 - Math.max(0, d.DegPct) / 100);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + (adjustedData.length - 1) * xScale, pad.top + plotH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    adjustedData.forEach((d, i) => {
      const x = pad.left + i * xScale;
      const y = pad.top + plotH * (1 - Math.max(0, d.DegPct) / 100);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = isUrgent ? "#ef4444" : "#22d3ee";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Last point
    const lastD = adjustedData[adjustedData.length - 1];
    const lastX = pad.left + (adjustedData.length - 1) * xScale;
    const lastY = pad.top + plotH * (1 - Math.max(0, lastD.DegPct) / 100);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle =
      lastD.DegPct <= CLIFF_THRESHOLD
        ? "#ef4444"
        : lastD.DegPct <= WARNING_THRESHOLD
          ? "#f97316"
          : "#22d3ee";
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.stroke();

    // X axis labels
    ctx.fillStyle = "#64748b";
    ctx.font = "7px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    for (let i = 0; i < adjustedData.length; i += 3) {
      const x = pad.left + i * xScale;
      ctx.fillText(`L${adjustedData[i].LapNumber}`, x, h - 4);
    }

    // Y axis labels
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const val = i * 25;
      const y = pad.top + plotH * (1 - val / 100);
      ctx.fillText(`${val}`, pad.left - 4, y + 3);
    }
  }, [chaos.tireDegRate]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  const currentDeg = Math.max(0, mockTireDeg[mockTireDeg.length - 1].DegPct - (chaos.tireDegRate - 1) * (12 * 4));
  const isUrgent = chaos.tireDegRate > 1.5;

  return (
    <div className="apex-card flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="apex-label">TIRE DEGRADATION</span>
        <div className="flex items-center gap-2">
          {isUrgent && (
            <span className="text-[8px] font-bold text-apex-red bg-red-500/10 px-1 py-0.5 animate-pulse">
              {chaos.tireDegRate}x DEG
            </span>
          )}
          <span
            className="font-mono text-[11px] font-bold"
            style={{
              color:
                currentDeg <= CLIFF_THRESHOLD
                  ? "#ef4444"
                  : currentDeg <= WARNING_THRESHOLD
                    ? "#f97316"
                    : "#22d3ee",
            }}
          >
            {Math.round(currentDeg)}%
          </span>
        </div>
      </div>
      <canvas ref={canvasRef} className="w-full" style={{ height: 100 }} />
    </div>
  );
}
