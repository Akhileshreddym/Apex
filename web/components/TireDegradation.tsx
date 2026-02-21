"use client";

import { useRef, useEffect, useCallback } from "react";
import { mockTireDeg } from "@/lib/mock-data";

const CLIFF_THRESHOLD = 30;
const WARNING_THRESHOLD = 50;

export default function TireDegradation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
    }

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

    const xScale = plotW / (mockTireDeg.length - 1);

    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
    gradient.addColorStop(0, "#22d3ee33");
    gradient.addColorStop(1, "#22d3ee00");

    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + plotH);
    mockTireDeg.forEach((d, i) => {
      const x = pad.left + i * xScale;
      const y = pad.top + plotH * (1 - d.DegPct / 100);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + (mockTireDeg.length - 1) * xScale, pad.top + plotH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    mockTireDeg.forEach((d, i) => {
      const x = pad.left + i * xScale;
      const y = pad.top + plotH * (1 - d.DegPct / 100);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.stroke();

    const lastD = mockTireDeg[mockTireDeg.length - 1];
    const lastX = pad.left + (mockTireDeg.length - 1) * xScale;
    const lastY = pad.top + plotH * (1 - lastD.DegPct / 100);
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

    ctx.fillStyle = "#64748b";
    ctx.font = "7px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    for (let i = 0; i < mockTireDeg.length; i += 3) {
      const x = pad.left + i * xScale;
      ctx.fillText(`L${mockTireDeg[i].LapNumber}`, x, h - 4);
    }

    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const val = i * 25;
      const y = pad.top + plotH * (1 - val / 100);
      ctx.fillText(`${val}`, pad.left - 4, y + 3);
    }
  }, []);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  const currentDeg = mockTireDeg[mockTireDeg.length - 1].DegPct;

  return (
    <div className="apex-card flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="apex-label">TIRE DEGRADATION</span>
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
          {currentDeg}%
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full" style={{ height: 100 }} />
    </div>
  );
}
