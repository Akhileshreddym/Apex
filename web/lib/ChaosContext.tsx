"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useWebSocket } from "@/lib/useWebSocket";

export interface ChaosState {
    /** Latest event name */
    event: string;
    /** Math results from Monte Carlo */
    mathResults: {
        predicted_total_time: number;
        win_probability: number;
        recommendation: string;
        math_baseline_lap: number;
    } | null;
    /** AI radio call script */
    radioCall: string;
    /** Full event history (most recent first) */
    eventHistory: ChaosHistoryEntry[];
    /** Weather overrides from events */
    weather: {
        isRaining: boolean;
        trackTempBoost: number;
    };
    /** Tire degradation modifier */
    tireDegRate: number;
    /** Accumulated time penalty */
    timePenalty: number;
    /** WebSocket connected */
    connected: boolean;
}

export interface ChaosHistoryEntry {
    id: string;
    event: string;
    timestamp: number;
    recommendation: string;
    winProbability: number;
}

const DEFAULT_STATE: ChaosState = {
    event: "",
    mathResults: null,
    radioCall: "",
    eventHistory: [],
    weather: { isRaining: false, trackTempBoost: 0 },
    tireDegRate: 1.0,
    timePenalty: 0,
    connected: false,
};

const ChaosContext = createContext<ChaosState>(DEFAULT_STATE);

export function useChaos() {
    return useContext(ChaosContext);
}

export function ChaosProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<ChaosState>(DEFAULT_STATE);

    const onMessage = useCallback((data: any) => {
        if (!data || !data.event) return;

        const event = data.event as string;
        const math = data.math_results ?? null;
        const radio = data.radio_call ?? "";

        setState((prev) => {
            // Build new history entry
            const historyEntry: ChaosHistoryEntry = {
                id: Math.random().toString(36).slice(2),
                event,
                timestamp: Date.now(),
                recommendation: math?.recommendation ?? "",
                winProbability: math?.win_probability ?? 0,
            };

            // Weather modifications
            let weather = { ...prev.weather };
            if (event === "rain") {
                weather.isRaining = true;
                weather.trackTempBoost = -10;
            } else if (event === "heatwave") {
                weather.isRaining = false;
                weather.trackTempBoost = 15;
            }

            // Tire deg rate
            let tireDegRate = prev.tireDegRate;
            if (event === "tyre_deg") tireDegRate = 2.5;
            else if (event === "heatwave") tireDegRate = 2.0;
            else if (event === "rain") tireDegRate = 1.8;

            // Time penalty
            let timePenalty = prev.timePenalty;
            if (event === "penalty_5s") timePenalty += 5;

            return {
                event,
                mathResults: math,
                radioCall: radio,
                eventHistory: [historyEntry, ...prev.eventHistory].slice(0, 20),
                weather,
                tireDegRate,
                timePenalty,
                connected: true,
            };
        });
    }, []);

    const { connected } = useWebSocket({
        url: "ws://localhost:8000/ws/chaos",
        onMessage,
    });

    // Merge connected status
    const value: ChaosState = { ...state, connected };

    return (
        <ChaosContext.Provider value={value}>
            {children}
        </ChaosContext.Provider>
    );
}
