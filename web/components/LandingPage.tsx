"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import gsap from "gsap";

interface LandingPageProps {
    onEnter: (driverName: string, portraitUrl: string) => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
    const [name, setName] = useState("");
    const [phase, setPhase] = useState<"welcome" | "camera" | "generating" | "ready">("welcome");
    const [selfieData, setSelfieData] = useState<string | null>(null);
    const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
    const [generatingText, setGeneratingText] = useState("Initializing neural network...");
    const [mounted, setMounted] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);
    const lineRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const tagRef = useRef<HTMLParagraphElement>(null);
    const formRef = useRef<HTMLDivElement>(null);
    const ctaRef = useRef<HTMLDivElement>(null);
    const cameraBoxRef = useRef<HTMLDivElement>(null);

    useEffect(() => setMounted(true), []);

    /* ─── GSAP ENTRANCE ─── */
    useEffect(() => {
        if (phase !== "welcome" || !mounted) return;

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        if (logoRef.current) {
            tl.fromTo(logoRef.current,
                { opacity: 0, y: -20 },
                { opacity: 1, y: 0, duration: 0.7 },
                0.2
            );
        }

        if (lineRef.current) {
            tl.fromTo(lineRef.current,
                { scaleX: 0 },
                { scaleX: 1, duration: 0.8, ease: "power2.inOut" },
                0.4
            );
        }

        if (titleRef.current) {
            tl.fromTo(titleRef.current,
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 0.7 },
                0.6
            );
        }

        if (tagRef.current) {
            tl.fromTo(tagRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.6 },
                0.9
            );
        }

        if (formRef.current) {
            tl.fromTo(formRef.current,
                { opacity: 0, y: 25 },
                { opacity: 1, y: 0, duration: 0.6 },
                1.0
            );
        }

        if (ctaRef.current) {
            tl.fromTo(ctaRef.current,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5 },
                1.2
            );
        }
    }, [phase, mounted]);

    /* ─── CAMERA ─── */
    useEffect(() => {
        if (phase !== "camera") return;
        if (cameraBoxRef.current) {
            gsap.fromTo(cameraBoxRef.current,
                { opacity: 0, scale: 0.95 },
                { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" }
            );
        }
    }, [phase]);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: 640, height: 480 },
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            console.error("Camera error:", err);
        }
    }, []);

    const capturePhoto = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        setSelfieData(canvas.toDataURL("image/jpeg", 0.8));
        streamRef.current?.getTracks().forEach(t => t.stop());
    }, []);

    const generatePortrait = useCallback(async () => {
        setPhase("generating");
        const msgs = ["Analyzing facial geometry...", "Rendering race suit...", "Applying livery...", "Final calibration..."];
        let i = 0;
        const iv = setInterval(() => { i = (i + 1) % msgs.length; setGeneratingText(msgs[i]); }, 1800);
        try {
            const res = await fetch("/api/generate-portrait", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ selfieBase64: selfieData }),
            });
            const data = await res.json();
            clearInterval(iv);
            setPortraitUrl(data.portraitUrl || selfieData);
        } catch { clearInterval(iv); setPortraitUrl(selfieData); }
        setPhase("ready");
    }, [selfieData]);

    const skipCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        onEnter(name || "Brad Pitt", "/driver_apx.jpg");
    }, [name, onEnter]);

    const enterPitWall = useCallback(() => {
        const fn = name || "Brad Pitt";
        const fp = portraitUrl || selfieData || "/driver_apx.jpg";
        if (containerRef.current) {
            gsap.to(containerRef.current, { opacity: 0, duration: 0.4, ease: "power2.in", onComplete: () => onEnter(fn, fp) });
        } else { onEnter(fn, fp); }
    }, [name, portraitUrl, selfieData, onEnter]);

    return (
        <div ref={containerRef} className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: "#080b12" }}>

            {phase === "welcome" && (
                <div className="flex flex-col items-center gap-6 z-10 w-full max-w-md px-8">
                    {/* Logo */}
                    <div ref={logoRef} className="flex items-center gap-2.5 mb-2">
                        <div className="w-3 h-3 bg-red-500" />
                        <span className="font-mono text-xl font-black tracking-[0.35em] text-white">APEX</span>
                    </div>

                    {/* Line */}
                    <div ref={lineRef} className="w-16 h-px bg-white/10 origin-center" />

                    {/* Title */}
                    <h1 ref={titleRef} className="text-6xl font-black text-white tracking-tight leading-none text-center">
                        PIT WALL
                    </h1>

                    {/* Tagline */}
                    <p ref={tagRef} className="text-[11px] text-white/25 font-mono tracking-[0.25em] uppercase">
                        AI-Powered F1 Strategy
                    </p>

                    {/* Name input */}
                    <div ref={formRef} className="w-full mt-4">
                        <label className="text-[8px] text-white/20 font-mono tracking-[0.3em] uppercase mb-1.5 block">Driver Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Brad Pitt"
                            className="w-full px-4 py-3 rounded text-white font-mono text-sm tracking-wider placeholder:text-white/15 outline-none focus:ring-1 focus:ring-red-500/30"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                        />
                    </div>

                    {/* Buttons */}
                    <div ref={ctaRef} className="flex flex-col items-center gap-3 w-full mt-2">
                        <button
                            onClick={() => { setPhase("camera"); setTimeout(startCamera, 300); }}
                            className="w-full py-3.5 rounded font-mono text-xs font-bold tracking-[0.2em] uppercase text-white hover:brightness-110 active:scale-[0.98] transition-all"
                            style={{ background: "#dc2626" }}
                        >
                            📸  TAKE DRIVER PHOTO
                        </button>
                        <button
                            onClick={skipCamera}
                            className="text-[9px] text-white/15 font-mono tracking-widest hover:text-white/30 transition-colors uppercase"
                        >
                            Skip — use default
                        </button>
                    </div>
                </div>
            )}

            {phase === "camera" && (
                <div ref={cameraBoxRef} className="flex flex-col items-center gap-5 z-10">
                    <span className="text-[10px] text-white/25 font-mono tracking-[0.25em] uppercase">Position your face in frame</span>
                    <div className="relative rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                        {!selfieData ? (
                            <video ref={videoRef} autoPlay playsInline muted className="w-[480px] h-[360px] object-cover" style={{ transform: "scaleX(-1)" }} />
                        ) : (
                            <img src={selfieData} alt="Selfie" className="w-[480px] h-[360px] object-cover" />
                        )}
                        {!selfieData && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-40 h-52 rounded-full border border-dashed border-white/10" />
                            </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <div className="flex gap-3">
                        {!selfieData ? (
                            <button onClick={capturePhoto} className="px-8 py-3 rounded font-mono text-sm font-bold tracking-wider text-white" style={{ background: "#dc2626" }}>
                                CAPTURE
                            </button>
                        ) : (
                            <>
                                <button onClick={() => { setSelfieData(null); startCamera(); }} className="px-5 py-2.5 rounded font-mono text-xs text-white/40 border border-white/10 hover:border-white/20">RETAKE</button>
                                <button onClick={generatePortrait} className="px-8 py-3 rounded font-mono text-sm font-bold tracking-wider text-white" style={{ background: "#dc2626" }}>GENERATE →</button>
                            </>
                        )}
                    </div>
                    <button onClick={skipCamera} className="text-[9px] text-white/12 font-mono tracking-widest hover:text-white/25 transition-colors">Skip</button>
                </div>
            )}

            {phase === "generating" && (
                <div className="flex flex-col items-center gap-5 z-10">
                    <div className="w-12 h-12 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
                    <span className="font-mono text-xs text-white/30 tracking-wider">{generatingText}</span>
                </div>
            )}

            {phase === "ready" && (
                <div className="flex flex-col items-center gap-5 z-10">
                    <div className="w-36 h-36 rounded-full overflow-hidden" style={{ border: "2px solid rgba(255,255,255,0.1)" }}>
                        <img src={portraitUrl || selfieData || "/driver_apx.jpg"} alt="Portrait" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-mono text-base text-white font-bold tracking-wider">{name || "Brad Pitt"}</span>
                    <button onClick={enterPitWall} className="px-10 py-3.5 rounded font-mono text-xs font-bold tracking-[0.2em] uppercase text-white hover:brightness-110 active:scale-[0.98] transition-all" style={{ background: "#dc2626" }}>
                        ENTER PIT WALL →
                    </button>
                </div>
            )}

            <div className="absolute bottom-5 text-[7px] text-white/8 font-mono tracking-[0.3em] uppercase">Hacklytics 2026</div>
        </div>
    );
}
