"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ChaosEvent } from "@/lib/types";
import { useWebSocket } from "@/lib/useWebSocket";
import gsap from "gsap";

/* ─── CHAOS EVENT DEFINITIONS ─── */
interface ChaosButton {
  event: ChaosEvent["event"];
  label: string;
  subtitle: string;
  icon: string;
  accentHue: number;       // HSL hue for dynamic theming
  severity: "critical" | "warning" | "info";
  intensity?: string;
}

const CHAOS_BUTTONS: ChaosButton[] = [
  {
    event: "minor_crash",
    label: "MINOR CRASH",
    subtitle: "Virtual Safety Car deployed — debris on track",
    icon: "💥",
    accentHue: 38,
    severity: "warning",
  },
  {
    event: "major_crash",
    label: "MAJOR CRASH",
    subtitle: "Full Safety Car — heavy barrier impact",
    icon: "🚨",
    accentHue: 0,
    severity: "critical",
  },
  {
    event: "rain",
    label: "SURFACE WATER",
    subtitle: "Heavy downpour — aquaplaning risk high",
    icon: "⛈",
    accentHue: 210,
    severity: "critical",
    intensity: "heavy",
  },
  {
    event: "heatwave",
    label: "HEATWAVE",
    subtitle: "Track temperatures exceeding limits",
    icon: "🔥",
    accentHue: 25,
    severity: "warning",
  },
  {
    event: "traffic",
    label: "DRS TRAIN",
    subtitle: "Car stuck in turbulent dirty air",
    icon: "🐌",
    accentHue: 215,
    severity: "info",
  },
  {
    event: "tyre_failure",
    label: "TYRE FAILURE",
    subtitle: "Sudden delamination — immediate box",
    icon: "💥",
    accentHue: 350,
    severity: "critical",
  },
  {
    event: "penalty_5s",
    label: "TIME PENALTY",
    subtitle: "5s added — track limits violation",
    icon: "⏱",
    accentHue: 270,
    severity: "info",
  },
  {
    event: "tyre_deg",
    label: "TYRE CLIFF",
    subtitle: "Degradation spike — loss of rear grip",
    icon: "📉",
    accentHue: 340,
    severity: "warning",
  },
];

/* ─── SEVERITY COLORS ─── */
const severityAccent = (severity: string) => {
  if (severity === "critical") return "hsl(0, 85%, 55%)";
  if (severity === "warning") return "hsl(38, 95%, 55%)";
  return "hsl(210, 50%, 55%)";
};

/* ─── COMPONENT ─── */
export default function StewardPage() {
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<{ label: string; time: string }[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scanlineRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { send } = useWebSocket({
    url: "ws://localhost:8000/ws/chaos"
  });

  /* ─── GSAP ENTRANCE ANIMATIONS ─── */
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // Header slides down
    if (headerRef.current) {
      tl.fromTo(headerRef.current,
        { y: -60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 }
      );
    }

    // Flash bar fades in
    if (flashRef.current) {
      tl.fromTo(flashRef.current,
        { opacity: 0, scaleX: 0.8 },
        { opacity: 1, scaleX: 1, duration: 0.4 },
        "-=0.3"
      );
    }

    // Buttons stagger in from bottom with scale bounce
    const validBtns = btnRefs.current.filter(Boolean);
    if (validBtns.length > 0) {
      tl.fromTo(validBtns,
        { y: 80, opacity: 0, scale: 0.85 },
        {
          y: 0, opacity: 1, scale: 1,
          duration: 0.5,
          stagger: { amount: 0.4, from: "start", grid: [4, 2] },
          ease: "back.out(1.4)",
        },
        "-=0.2"
      );
    }

    // Footer slides up
    if (footerRef.current) {
      tl.fromTo(footerRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4 },
        "-=0.3"
      );
    }

    // Continuous ambient scanline
    if (scanlineRef.current) {
      gsap.fromTo(scanlineRef.current,
        { y: "-100%" },
        { y: "100%", duration: 4, repeat: -1, ease: "none", opacity: 0.03 }
      );
    }
  }, []);

  /* ─── CHAOS INJECT HANDLER ─── */
  const handleChaos = useCallback(
    (btn: ChaosButton, index: number) => {
      const payload: ChaosEvent = {
        event: btn.event,
        ...(btn.intensity && { intensity: btn.intensity }),
      };

      // Log timestamp
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setEventLog(prev => [{ label: btn.label, time: timeStr }, ...prev].slice(0, 8));
      setLastEvent(`${btn.icon}  ${btn.label} INJECTED`);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setLastEvent(null), 3000);

      // GSAP button press animation
      const el = btnRefs.current[index];
      if (el) {
        const hue = btn.accentHue;
        gsap.timeline()
          .to(el, {
            scale: 0.93,
            duration: 0.08,
            ease: "power2.in",
          })
          .to(el, {
            scale: 1.03,
            duration: 0.25,
            ease: "elastic.out(1.2, 0.4)",
            boxShadow: `0 0 60px hsla(${hue}, 80%, 50%, 0.5), inset 0 1px 0 hsla(${hue}, 80%, 70%, 0.2)`,
          })
          .to(el, {
            scale: 1,
            duration: 0.4,
            ease: "power2.out",
            boxShadow: `0 0 0px hsla(${hue}, 80%, 50%, 0)`,
          });

        // Flash the inner glow ring
        const ring = el.querySelector(".glow-ring") as HTMLElement;
        if (ring) {
          gsap.fromTo(ring,
            { opacity: 0.8, scale: 0.5 },
            { opacity: 0, scale: 2.5, duration: 0.7, ease: "power2.out" }
          );
        }
      }

      // Flash banner animation
      if (flashRef.current) {
        gsap.fromTo(flashRef.current,
          { backgroundColor: `hsla(${btn.accentHue}, 70%, 40%, 0.3)` },
          { backgroundColor: "rgba(10, 15, 26, 0)", duration: 1.5, ease: "power2.out" }
        );
      }

      send(payload);
    },
    [send]
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative" style={{ background: "linear-gradient(180deg, #060a12 0%, #0d1320 40%, #0a0f1a 100%)" }}>
      {/* Ambient scanline overlay */}
      <div ref={scanlineRef} className="absolute inset-0 pointer-events-none z-50" style={{
        background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.015) 50%, transparent 100%)",
        height: "200%",
      }} />

      {/* Subtle grid texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }} />

      {/* ─── HEADER ─── */}
      <header ref={headerRef} className="h-16 flex items-center justify-between px-8 shrink-0 relative z-10" style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(180deg, rgba(15,20,35,0.95) 0%, rgba(10,15,26,0.8) 100%)",
        backdropFilter: "blur(20px)",
      }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 bg-red-500 rounded-sm" style={{ boxShadow: "0 0 12px rgba(239,68,68,0.5)" }} />
            <span className="font-mono text-sm font-bold tracking-[0.25em] text-white">
              APEX
            </span>
          </div>
          <div className="w-px h-5 bg-white/10" />
          <span className="text-[11px] text-white/30 uppercase tracking-[0.2em] font-light">
            Race Steward Console
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: "0 0 8px rgba(52,211,153,0.5)" }} />
            <span className="text-[11px] text-white/40 font-mono tracking-wider">
              LIVE
            </span>
          </div>
        </div>
      </header>

      {/* ─── EVENT FLASH BANNER ─── */}
      <div ref={flashRef} className="h-12 flex items-center justify-center shrink-0 relative z-10" style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        {lastEvent ? (
          <span className="font-mono text-sm font-bold tracking-wider" style={{
            background: "linear-gradient(90deg, #f59e0b, #ef4444)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            {lastEvent}
          </span>
        ) : (
          <span className="text-[11px] text-white/15 font-mono uppercase tracking-[0.3em]">
            Select a scenario to inject into the live simulation
          </span>
        )}
      </div>

      {/* ─── BUTTON GRID ─── */}
      <div ref={gridRef} className="flex-1 grid grid-cols-2 gap-4 p-5 overflow-hidden relative z-10">
        {CHAOS_BUTTONS.map((btn, i) => {
          const hue = btn.accentHue;
          const accent = `hsl(${hue}, 75%, 55%)`;
          const accentDim = `hsla(${hue}, 60%, 45%, 0.15)`;
          const accentGlow = `hsla(${hue}, 80%, 50%, 0.08)`;

          return (
            <button
              key={btn.event}
              ref={el => { btnRefs.current[i] = el; }}
              onClick={() => handleChaos(btn, i)}
              className="group relative flex flex-col items-center justify-center gap-3 rounded-xl overflow-hidden select-none cursor-pointer"
              style={{
                background: `linear-gradient(170deg, ${accentGlow} 0%, rgba(12,17,28,0.95) 40%, rgba(8,12,22,0.98) 100%)`,
                border: `1px solid hsla(${hue}, 40%, 40%, 0.2)`,
                transition: "border-color 0.3s ease",
              }}
              onMouseEnter={(e) => {
                gsap.to(e.currentTarget, {
                  borderColor: `hsla(${hue}, 60%, 55%, 0.5)`,
                  duration: 0.3,
                });
              }}
              onMouseLeave={(e) => {
                gsap.to(e.currentTarget, {
                  borderColor: `hsla(${hue}, 40%, 40%, 0.2)`,
                  duration: 0.5,
                });
              }}
            >
              {/* Glow ring for press animation */}
              <div className="glow-ring absolute inset-0 rounded-xl pointer-events-none opacity-0" style={{
                border: `2px solid ${accent}`,
                boxShadow: `0 0 30px ${accent}`,
              }} />

              {/* Top accent line */}
              <div className="absolute top-0 left-[15%] right-[15%] h-px" style={{
                background: `linear-gradient(90deg, transparent, hsla(${hue}, 70%, 55%, 0.4), transparent)`,
              }} />

              {/* Severity tag */}
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full" style={{
                background: `hsla(${hue}, 50%, 50%, 0.12)`,
                border: `1px solid hsla(${hue}, 50%, 50%, 0.2)`,
              }}>
                <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: severityAccent(btn.severity) }}>
                  {btn.severity}
                </span>
              </div>

              {/* Icon */}
              <span className="text-5xl select-none" style={{
                filter: "drop-shadow(0 0 12px rgba(255,255,255,0.1))",
              }}>
                {btn.icon}
              </span>

              {/* Label */}
              <span
                className="font-mono text-lg font-black tracking-[0.15em]"
                style={{ color: accent }}
              >
                {btn.label}
              </span>

              {/* Subtitle */}
              <span className="text-[10px] text-white/30 font-mono text-center px-6 leading-relaxed">
                {btn.subtitle}
              </span>

              {/* Bottom corner accents */}
              <div className="absolute bottom-0 left-0 w-6 h-6">
                <div className="absolute bottom-0 left-0 w-full h-px" style={{ background: `hsla(${hue}, 60%, 50%, 0.25)` }} />
                <div className="absolute bottom-0 left-0 w-px h-full" style={{ background: `hsla(${hue}, 60%, 50%, 0.25)` }} />
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6">
                <div className="absolute bottom-0 right-0 w-full h-px" style={{ background: `hsla(${hue}, 60%, 50%, 0.25)` }} />
                <div className="absolute bottom-0 right-0 w-px h-full" style={{ background: `hsla(${hue}, 60%, 50%, 0.25)` }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── EVENT LOG SIDEBAR ─── */}
      {eventLog.length > 0 && (
        <div className="absolute top-20 right-5 w-52 z-20 flex flex-col gap-1" style={{
          background: "rgba(8,12,22,0.85)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "8px",
          padding: "10px",
          backdropFilter: "blur(12px)",
        }}>
          <span className="text-[8px] text-white/25 font-mono tracking-widest mb-1">EVENT LOG</span>
          {eventLog.map((e, i) => (
            <div key={i} className="flex items-center justify-between" style={{ opacity: 1 - i * 0.1 }}>
              <span className="text-[9px] text-white/50 font-mono">{e.label}</span>
              <span className="text-[8px] text-white/20 font-mono">{e.time}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <footer ref={footerRef} className="h-10 flex items-center justify-center shrink-0 relative z-10" style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(10,15,26,0.6)",
      }}>
        <span className="text-[9px] text-white/15 font-mono tracking-[0.3em] uppercase">
          Apex Steward v2.0 — Hacklytics 2026
        </span>
      </footer>
    </div>
  );
}
