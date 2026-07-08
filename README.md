# APEX — F1 Strategy & Chaos Simulator

> **"Outsmart the Grid"**

**Hacklytics 2026** — A real-time, interactive F1 pit wall simulator with a dual-screen architecture. Built in 36 hours at Georgia Tech's Hacklytics 2026 hackathon.

---

## Inspiration

Apex was inspired by the new F1 movie and by the intensity of race-day decision-making it brings to life. Watching the pit wall pressure, split-second calls, and constant strategy adjustments made us want to build something that captures that same feeling — where users experience what it is like to be the one making the call under pressure, not just watching the race. That idea prompted us to create a simulator that combines the drama of F1 with data-driven strategy and live-race visuals.

---

## What It Does

Apex is a real-time F1 pit wall simulator where you act as the strategist. You get a live Monza track map with 20 cars moving in real time, plus a full timing board showing gaps, intervals, sector times, tyre compounds, and pit counts updating constantly as the race unfolds.

The **live race UI** (timing board, pit windows, undercut/overcut hints) is driven by frontend simulation logic seeded from real 2023 Monza data. When a chaos event fires from the iPad, the **Python backend** runs **10,000 Monte Carlo simulations** via the trained two-stage model and returns win probability plus a strategy recommendation. A WebSocket chaos engine can trigger rain, crashes, safety cars, and penalties — which instantly force strategy changes and trigger context-aware race engineer radio updates (via Gemini). Judges and spectators can follow everything through a synced iPad steward view while you manage the player car **APX**.

---

## Architecture

```
┌─────────────────────┐    WebSocket     ┌──────────────────────────────┐    WebSocket     ┌─────────────────────┐
│   iPad (Steward)    │ ──────────────→  │     Python FastAPI Server    │ ──────────────→  │  Laptop (Pit Wall)  │
│   /ipad route       │   chaos event    │                              │   results        │  / route            │
│                     │                  │  Ridge → XGBoost → Monte     │                  │                     │
│  Rain | Crash | SC  │                  │  Carlo → LLM                 │                  │  Telemetry Canvas   │
│  buttons            │                  │                              │                  │  Timing Board       │
└─────────────────────┘                  │  /ws/chaos endpoint          │                  │  Strategy Panel     │
                                         └──────────────────────────────┘                  │  Weather / Tires    │
                                                                                           └─────────────────────┘
```

Race visualization data (timing, weather, track shape, race control) is loaded from static JSON in `web/lib/`, exported once by `get_f1_data.py`. The backend handles chaos events and ML inference only.

### The Golden Loop

1. User taps **"Rain"** on the iPad
2. Frontend sends a chaos payload via WebSocket to FastAPI (e.g. `{"event": "rain", "compound": "MEDIUM", "current_tire_age": 15, "laps_left": 30}`)
3. **Stage 1**: Ridge regression estimates circuit base pace from track geometry (length + corners)
4. **Stage 2**: XGBoost predicts the per-lap residual from tyre age, compound, position, fuel load, stint, driver, weather, and circuit geometry — anchored to the **GP median pace** (87.0s at Monza)
5. NumPy Monte Carlo runs **10,000 simulations** with event penalties + Gaussian noise in <0.2s
6. Gemini (via OpenRouter) formats the math output into a radio call
7. Result is broadcast to all connected Pit Wall clients via WebSocket

---

## Tech Stack

| Layer | Tech | Purpose |
|---|---|---|
| Frontend | Next.js App Router, Tailwind CSS | Pit Wall dashboard + iPad chaos console |
| Animation | GSAP | Smooth car position transitions on track map |
| Canvas | HTML5 `<canvas>`, `requestAnimationFrame` | 20-car track animation (car positions in refs, minimal React re-renders) |
| Backend | Python FastAPI | WebSocket server for chaos events + ML inference |
| ML — Stage 1 | Ridge Regression + Polynomial Features (degree 2) | Circuit-level base lap time prediction (generalizes across tracks) |
| ML — Stage 2 | XGBoost + sklearn `ColumnTransformer` | Per-lap residual prediction from race-state features |
| Simulation | NumPy vectorized Monte Carlo | 10K race simulations in <0.2s |
| LLM | Gemini 2.5 Flash via OpenRouter | Text formatting only (zero math) |
| Data | FastF1 | Historical F1 timing, weather, telemetry |

---

## Project Structure

```
Apex/
├── Commands.md                # Useful dev commands
├── Info.md                    # Internal project notes
├── Instructions.md            # Setup instructions
├── README.md
│
├── web/                       # Next.js frontend
│   ├── app/
│   │   ├── page.tsx           # Pit Wall dashboard (laptop screen)
│   │   ├── ipad/page.tsx      # Steward chaos console (iPad screen)
│   │   ├── api/generate-portrait/  # Driver portrait API route
│   │   └── layout.tsx
│   ├── components/
│   │   ├── LandingPage.tsx    # Onboarding / driver portrait flow
│   │   ├── TrackCanvas.tsx    # HTML5 canvas car animation
│   │   ├── DriverCard.tsx     # Driver info panel
│   │   ├── CarTimings.tsx     # Live timing board + lap simulation
│   │   ├── StrategyPanel.tsx  # Strategy recommendations (from WebSocket)
│   │   ├── PitWindow.tsx      # Pit stop window calculator (frontend heuristics)
│   │   ├── WeatherPanel.tsx   # Weather conditions
│   │   ├── TireDegradation.tsx# Tire wear charts
│   │   └── RaceHistory.tsx    # Event history feed
│   └── lib/
│       ├── ChaosContext.tsx   # WebSocket state management
│       ├── useWebSocket.ts    # WebSocket hook with auto-reconnect
│       ├── types.ts           # TypeScript interfaces (FastF1-aligned)
│       ├── mock-data.ts       # Loads JSON data + lookup helpers
│       ├── format.ts          # Time formatting utilities
│       ├── timing_data.json   # Monza lap timing (exported)
│       ├── weather_data.json  # Race weather time-series
│       ├── monza.json         # Track GPS coordinates
│       ├── race_events_data.json
│       └── track_status_data.json
│
└── server/                    # Python FastAPI backend
    ├── main.py                # FastAPI server (WebSocket only)
    ├── simulator.py           # Monte Carlo simulation engine
    ├── train_engine.py        # Two-stage model training pipeline (Ridge + XGBoost)
    ├── get_f1_data.py         # FastF1 data extraction script
    ├── test_ws.py             # WebSocket testing utility
    ├── notebooks/
    │   └── feature_engineering.ipynb  # Feature engineering notebook
    ├── models/
    │   ├── engine_v2.joblib           # Trained Stage 2 XGBoost model (generated)
    │   ├── pace_model_v2.joblib       # Trained Stage 1 Ridge model (generated)
    │   ├── preprocessor_v2.joblib     # Sklearn preprocessor (generated)
    │   ├── feature_columns_v2.json  # Feature metadata (generated)
    │   └── circuit_medians.json       # Per-GP median lap anchors (generated)
    └── data/
        ├── laps_train.csv      # Lap training data (generated)
        ├── laps_test.csv       # Lap test data — Italy/Monza held out (generated)
        └── eval_report.json    # Model metrics (generated by train_engine.py)
```

---

## Data Pipeline

```
                        ┌───────────────────────────────────────────────-──┐
                        │              train_engine.py                     │
                        │                                                  │
  get_f1_data.py        │  Input A: laps_train.csv  (10 GPs)               │
       │                │  Input B: laps_test.csv   (Italy — held out)     │
   FastF1 API           │  Input C: circuit table   (TrackLength + Corners)│
       │                │                                                  │
       ▼                │  Stage 1: Ridge + PolynomialFeatures(deg=2)      │
  server/data/*.csv ────│           → predicts base lap time per circuit   │
  web/lib/*.json        │                                                  │
  (timing, weather,     │  Stage 2: XGBoost                                │
   track, events)       │           → predicts residual                    │
                        │             (lap time − GP median pace)          │
                        │                                                  │
                        │  Outputs:                                        │
                        │    engine_v2.joblib          (Stage 2 XGBoost)   │
                        │    pace_model_v2.joblib      (Stage 1 Ridge)     │
                        │    preprocessor_v2.joblib    (sklearn pipeline)  │
                        │    feature_columns_v2.json   (feature metadata)  │
                        │    circuit_medians.json      (inference anchors) │
                        │    eval_report.json          (model metrics)     │
                        └───────────────┬────────────────────────────────-─┘
                                        │
                                        ▼
                               main.py (runtime)
                               loads artifacts at startup
                               serves /ws/chaos (WebSocket only)
```

### Data Files

| File | Location | Rows / size | Description | Used By |
|---|---|---|---|---|
| `laps_train.csv` | `server/data/` | ~9,366 laps | 10 GPs for model training | `train_engine.py` |
| `laps_test.csv` | `server/data/` | ~878 laps | Italy (Monza) held-out test set | `train_engine.py` |
| `timing_data.json` | `web/lib/` | 20 drivers | Starting grid + Monza lap anchors | Frontend timing board |
| `weather_data.json` | `web/lib/` | 156 samples | Race weather time-series | `WeatherPanel` |
| `monza.json` | `web/lib/` | 637 points | Track GPS coordinates | `TrackCanvas` |
| `race_events_data.json` | `web/lib/` | 43 events | FIA race control messages | `RaceHistory` |
| `track_status_data.json` | `web/lib/` | — | Flag transitions | Yellow flag UI |

All `web/lib/*.json` files are exported by `get_f1_data.py` from FastF1. The frontend reads them directly — there are no REST data endpoints on the backend.

### Data Excluded (and why)

| Data | Reason |
|---|---|
| Full telemetry (all drivers × all laps) | ~10M+ rows — canvas interpolates from lap timing + track shape |
| Position data at 4Hz | Same issue — too large for a hackathon demo |
| Car data (RPM, throttle, brake for all cars) | Only needed for driver analysis, not strategy prediction |
| Q1/Q2/Q3 qualifying times | Qualifying pace ≠ race pace (different fuel, tire management, traffic) |

---

## ML Model: Two-Stage Lap Time Pipeline

### Overview

`train_engine.py` uses a **two-stage lap time modeling pipeline** designed to generalize across circuits while still capturing lap-by-lap race behavior.

### Stage 1 — Circuit Base Lap Time (Ridge Regression)

A Ridge regression model is fit on degree-2 polynomial features of `TrackLength` and `Corners` using **10 Grands Prix** (one row per circuit). This stage predicts base lap time for a given circuit and can extrapolate to unseen tracks (e.g. Monza/Italy), though with error (~4.7s off on Italy).

Ridge is used because, with only 10 data points, a regularized linear model is safer for extrapolation than a tree-based model. Polynomial features are **only** used in this stage.

### Stage 2 — Per-Lap Residuals (XGBoost)

XGBoost is trained to predict the **residual**: actual lap time minus the **GP median pace** for that circuit. Stage 2 learns lap-by-lap deviations from the typical pace caused by tyre degradation, stint progression, position/traffic, fuel load, and weather.

`EstBasePace` (the Ridge output) is **excluded** from Stage 2 features — including it caused the model to memorise circuit identity and fail on held-out GPs. At inference on Monza, the anchor comes from `circuit_medians.json` (87.0s); Ridge is the fallback for unknown circuits.

### Features (Stage 2)

| Feature | Type | Rationale |
|---|---|---|
| TyreLife | Numeric | Laps on current tyre set — degradation |
| Stint | Numeric | Which tyre stint — strategy phase |
| Position | Numeric | Dirty air / track position effects |
| FreshTyre | Numeric | New vs. used tyre set |
| Compound | Categorical (OHE) | SOFT / MEDIUM / HARD profiles |
| LapNumber | Numeric | Race progression |
| FuelLoad | Numeric | Normalized remaining fuel (derived from LapNumber) |
| Driver | Categorical (OHE) | Per-driver pace offset (2023 grid) |
| TrackLength, Corners | Numeric | Circuit geometry for extrapolation |
| AirTemp, TrackTemp, Humidity, Rainfall | Numeric | Weather conditions |

Sector times and speed-trap columns are excluded from training (mostly null or redundant).

### Preprocessing Pipeline

1. Remove invalid and pit laps
2. Apply a 70–150% median lap time filter to remove outliers
3. Estimate fuel load from lap number
4. Fill missing stint and position values
5. Median imputation + one-hot encoding for categorical features
6. Save Stage 1 bundle, Stage 2 XGBoost, preprocessor, feature list, and circuit medians

### Model Performance

Metrics from `data/eval_report.json` (run `python train_engine.py` to regenerate):

| Metric | Value | Notes |
|---|---|---|
| **5-Fold CV lap MAE** | **~0.35s** | Lap-level KFold on 10 training GPs |
| **5-Fold CV R²** | **0.996** | Explains 99.6% of lap-time variance in CV |
| **Training MAE** | **0.30s** | Full fit on 10 GPs |
| **Held-out Italy MAE** | **0.64s** | Monza test GP, using known circuit median anchor |
| **Stage 1 Italy extrapolation** | 82.3s est vs 87.0s actual | Ridge base pace; Stage 2 uses circuit median at inference |

### Honest Assessment

| Aspect | Status | Notes |
|---|---|---|
| Two-stage modeling | Correct | Stage 1 Ridge extrapolates circuit pace; Stage 2 XGBoost captures lap dynamics |
| Monte Carlo 10K sims | Correct | Runs on backend chaos events; frontend timing uses separate heuristics |
| LLM as text formatter only | Correct | Gemini does zero math — just formats the numbers into radio calls |
| Circuit-level Stage 1 dataset | Limitation | Only 10 GPs for Ridge — more data would improve base extrapolation |
| Chaos penalties are hardcoded | Limitation | Rain, SC, crash deltas are manual estimates in `simulator.py`, not learned |
| Win probability is circular | Limitation | Compares model output (with noise) against model output (without noise) |
| No REST API | Limitation | Frontend reads static JSON; backend is WebSocket-only |
| Model versioning | v2 | Latest trained artifacts stored in `server/models/` with v2 suffix |

### What Would Improve It

1. **More circuit data for Stage 1** — Expanding from 10 to 20+ GPs would make the Ridge base prediction more robust.
2. **Learn chaos penalties from data** — Use historical wet-weather and safety car races to learn actual penalties instead of hardcoding them.
3. **Predict degradation rate, not raw residuals** — Modeling "0.08s slower per lap on softs" is more transferable than raw second-level residuals.

---

## API

### WebSocket (backend)

| Endpoint | Direction | Payload |
|---|---|---|
| `ws://localhost:8000/ws/chaos` | Client → Server | `{"event": "rain", "compound": "MEDIUM", "current_tire_age": 15, "laps_left": 30, "position": 10, "stint": 2, "air_temp": 28.5, "track_temp": 43.0, "humidity": 45, "rainfall": 0}` |
| `ws://localhost:8000/ws/chaos` | Server → Client | `{"event": "rain", "math_results": {"predicted_total_time": ..., "win_probability": ..., "recommendation": "...", "math_baseline_lap": ...}, "radio_call": "Box box box!..."}` |

The backend does **not** expose REST endpoints. All race visualization data is served from `web/lib/*.json` at build/runtime on the Next.js side.

---

## Setup & Run

### Prerequisites

- Node.js 18+
- Python 3.11+ (conda environment recommended)
- `libomp` for XGBoost on macOS: `brew install libomp`

### Backend

```bash
cd server

# Install dependencies
pip install -r requirements.txt

# Step 1: Download F1 data (first run needs internet)
python get_f1_data.py

# Step 2: Train the two-stage model
python train_engine.py
# → Generates server/models/ artifacts + data/eval_report.json

# Step 3: Start the server
python main.py
# → Server runs at http://localhost:8000
```

On macOS, if XGBoost fails to load:

```bash
export DYLD_LIBRARY_PATH=/opt/homebrew/opt/libomp/lib:$DYLD_LIBRARY_PATH
python train_engine.py
```

### Frontend

```bash
cd web

# Install dependencies
npm install

# Start dev server
npm run dev
# → Pit Wall at http://localhost:3000
# → iPad steward console at http://localhost:3000/ipad
```

### Environment Variables

Create `server/.env`:

```env
OPENROUTER_API_KEY=your_key_here
# or
GEMINI_API_KEY=your_key_here
```

---

## Design System: "Tarmac Industrial"

- Dark backgrounds (`bg-gray-950`)
- Monospace fonts for all numbers (`font-mono`, JetBrains Mono)
- Sharp edges (no `rounded-full` except for car dots)
- High-contrast neon accents: Cyan (`#22d3ee`), Warning Orange (`#f97316`), Alert Red (`#ef4444`)

---

## What's Next for Apex

- REST API layer for live data serving (currently static JSON only)
- Learned chaos penalties from historical wet/SC races
- Full safety car / virtual safety car logic tied to backend MC
- Full race replays and custom scenario builder
- Player vs. player strategy battles
- Historical tracks and driver/car performance profiles

Long-term, we want Apex to become a game-like simulation and analytics tool for motorsport fans, students, and anyone who wants to experience what it feels like to run strategy from the pit wall.

---

## Contributors

| Name | GitHub / Devpost |
|---|---|
| **Sanket Deshmukh** | [@sanket1305](https://github.com/sanket1305) |
| **Akhilesh Reddy Mallu** | [@Akhileshreddym](https://github.com/Akhileshreddym) |
| **Arnov Kandlikar** | [@arnovkandlikar](https://github.com/arnovkandlikar) |
| **Devam Dholakia** | [@devamdholakia](https://github.com/devamdholakia) |

Built at **[Hacklytics 2026: Golden Byte](https://hacklytics-2026.devpost.com/)** — Georgia Tech's annual data science hackathon.

---
