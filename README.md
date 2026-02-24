# APEX — F1 Strategy & Chaos Simulator

> **"Outsmart the Grid"**

**Hacklytics 2026** — A real-time, interactive F1 pit wall simulator with a dual-screen architecture. Built in 24 hours at Georgia Tech's Hacklytics 2026 hackathon.

---

## Inspiration

Apex was inspired by the new F1 movie and by the intensity of race-day decision-making it brings to life. Watching the pit wall pressure, split-second calls, and constant strategy adjustments made us want to build something that captures that same feeling — where users experience what it is like to be the one making the call under pressure, not just watching the race. That idea prompted us to create a simulator that combines the drama of F1 with data-driven strategy and live-race visuals.

---

## What It Does

Apex is a real-time F1 pit wall simulator where you act as the strategist. You get a live Monza track map with 20 cars moving in real time, plus a full timing board showing gaps, intervals, sector times, tyre compounds, and pit counts updating constantly as the race unfolds.

When it's time to make a call, Apex runs **10,000 Monte Carlo simulations** to recommend pit windows, undercut or overcut options, and win probability based on the current race state and tyre degradation. A WebSocket chaos engine can trigger rain, crashes, safety cars, and penalties — which instantly force strategy changes and trigger context-aware race engineer radio updates. Judges and spectators can follow everything through a synced iPad steward view while you manage the Apex AI car, **number 20 APX**.

---

## Architecture

```
┌─────────────────────┐    WebSocket     ┌──────────────────────────────┐    WebSocket     ┌─────────────────────┐
│   iPad (Steward)    │ ──────────────→  │     Python FastAPI Server    │ ──────────────→  │  Laptop (Pit Wall)  │
│   /ipad route       │   chaos event    │                              │   results         │  / route            │
│                     │                  │  Ridge → XGBoost → Monte     │                  │                     │
│  Rain | Crash | SC  │                  │  Carlo → LLM                 │                  │  Telemetry Canvas   │
│  buttons            │                  │                              │                  │  Timing Board       │
└─────────────────────┘                  │  /ws/chaos endpoint          │                  │  Strategy Panel     │
                                         └──────────────────────────────┘                  │  Weather / Tires    │
                                                                                            └─────────────────────┘
```

### The Golden Loop

1. User taps **"Rain"** on the iPad
2. Frontend sends `{"event": "rain"}` via WebSocket to FastAPI
3. **Stage 1**: Ridge regression predicts a circuit-level base lap time from track geometry (length + corners)
4. **Stage 2**: XGBoost predicts the lap-by-lap residual from tire age, compound, position, fuel load, stint, and other race-state features
5. NumPy Monte Carlo runs **10,000 simulations** with event penalties + Gaussian noise in <0.2s
6. Gemini API formats the math output into a 3-sentence radio call
7. Result is broadcast to all connected Pit Wall clients via WebSocket

---

## Tech Stack

| Layer | Tech | Purpose |
|---|---|---|
| Frontend | Next.js App Router, Tailwind CSS | Pit Wall dashboard + iPad chaos console |
| Animation | GSAP | Smooth car position transitions on track map |
| Canvas | HTML5 `<canvas>`, `requestAnimationFrame` | 20-car telemetry animation (zero React state) |
| Backend | Python FastAPI | WebSocket server + REST API |
| ML — Stage 1 | Ridge Regression + Polynomial Features (degree 2) | Circuit-level base lap time prediction (generalizes across tracks) |
| ML — Stage 2 | XGBoost (scikit-learn pipeline) | Per-lap residual prediction (tyre degradation, traffic, stint effects) |
| Simulation | NumPy vectorized Monte Carlo | 10K race simulations in <0.2s |
| LLM | Gemini API via OpenRouter | Text formatting only (zero math) |
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
│   │   └── layout.tsx
│   ├── components/
│   │   ├── TrackCanvas.tsx    # HTML5 canvas car animation
│   │   ├── DriverCard.tsx     # Driver info panel
│   │   ├── CarTimings.tsx     # Live timing board
│   │   ├── StrategyPanel.tsx  # Strategy recommendations
│   │   ├── PitWindow.tsx      # Pit stop window calculator
│   │   ├── WeatherPanel.tsx   # Weather conditions
│   │   ├── TireDegradation.tsx# Tire wear charts
│   │   └── RaceHistory.tsx    # Event history feed
│   └── lib/
│       ├── ChaosContext.tsx   # WebSocket state management
│       ├── useWebSocket.ts    # WebSocket hook with auto-reconnect
│       ├── types.ts           # TypeScript interfaces (FastF1-aligned)
│       ├── mock-data.ts       # Fallback mock data
│       └── format.ts          # Time formatting utilities
│
└── server/                    # Python FastAPI backend
    ├── main.py                # FastAPI server (WebSocket + REST endpoints)
    ├── simulator.py           # Monte Carlo simulation engine
    ├── train_engine.py        # Two-stage model training pipeline (Ridge + XGBoost)
    ├── get_f1_data.py         # FastF1 data extraction script
    ├── test_ws.py             # WebSocket testing utility
    ├── notebooks/
    │   └── feature_engineering.ipynb  # Feature engineering notebook
    ├── models/
    │   ├── engine_v2.joblib           # Trained Stage 2 XGBoost model (generated)
    │   ├── pace_model_v2.joblib       # Trained pace prediction model (generated)
    │   ├── preprocessor_v2.joblib     # Sklearn pipeline (generated)
    │   └── feature_columns_v2.json    # Feature metadata (generated)
    └── data/
        ├── laps_train.csv      # Lap training data (generated)
        └── laps_test.csv       # Lap test data (generated)
```

---

## Data Pipeline

```
                        ┌─────────────────────────────────────────────────┐
                        │              train_engine.py                    │
                        │                                                 │
  get_f1_data.py        │  Input A: laps_train.csv  (from get_f1_data.py)│
       │                │  Input B: hardcoded circuit table               │
   FastF1 API           │           (10 GPs: TrackLength + Corners)      │
       │                │                                                 │
       ▼                │  Stage 1: Ridge + PolynomialFeatures(deg=2)    │
  CSV files ────────────│           → predicts base lap time per circuit  │
  (server/data/)        │                                                 │
                        │  Stage 2: XGBoost                              │
                        │           → predicts residual (actual - base)  │
                        │             from per-lap race-state features    │
                        │                                                 │
                        │  Outputs:                                       │
                        │    engine_v2.joblib          (Stage 2 XGBoost)  │
                        │    pace_model_v2.joblib      (Pace model)       │
                        │    preprocessor_v2.joblib    (sklearn pipeline) │
                        │    feature_columns_v2.json   (feature metadata) │
                        └───────────────┬─────────────────────────────────┘
                                        │
                                        ▼
                               main.py (runtime)
                               loads artifacts at startup
                               serves /ws/chaos + REST endpoints
```

### CSV Files Extracted

| File | Location | Rows | Description | Used By |
|---|---|---|---|---|
| `laps_train.csv` | `server/data/` | ~700 | Training set for all laps, all 20 drivers | Model training |
| `laps_test.csv` | `server/data/` | ~258 | Test set for model validation | Model evaluation |
| Integration data | embedded in scripts | N/A | Driver metadata, weather, telemetry, race control | Frontend REST endpoints, simulator |

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

A Ridge regression model is fit on degree-2 polynomial features of `TrackLength` and `Corners` using a small circuit-level dataset of **10 Grands Prix** (one row per circuit). This stage predicts the base lap time for a given circuit, giving the system a stable estimate of overall pace and allowing it to extrapolate to unseen tracks (e.g., Monza/Italy).

Ridge is used here because, with only 10 data points, a regularized linear model is far safer for extrapolation than a tree-based model — which would likely overfit and fail to transfer across circuits. Polynomial features are **only** used in this stage.

### Stage 2 — Per-Lap Residuals (XGBoost)

XGBoost is trained on per-lap features to predict the **residual**: actual lap time minus the Stage 1 base prediction. This setup makes the pipeline more circuit-agnostic because Stage 1 captures track-specific baseline pace and Stage 2 learns only the lap-by-lap deviations caused by tyre degradation, stint progression, traffic, and race conditions.

XGBoost is used here because it handles nonlinear feature interactions well and is proven on structured/tabular race data.

### Features (Stage 2)

| Feature | Importance | Rationale |
|---|---|---|
| Stint | Highest | Which tyre stint — captures strategy phase |
| Position | High | Dirty air effect (~0.3–0.5s loss following a car) |
| FreshTyre | High | New vs. used tyre set — grip difference |
| Compound | Medium | SOFT/MEDIUM/HARD performance profiles |
| LapNumber | Medium | Proxy for fuel load (lighter car = faster) |
| FuelLoad | Medium | Normalized remaining fuel (derived from LapNumber) |
| TyreLife | Medium | Laps on current tyre set — degradation |
| AvgSpeed | Low | Mean speed trap reading — car performance proxy |

### Preprocessing Pipeline

1. Remove invalid and pit laps
2. Apply a 70–150% median lap time filter to remove outliers
3. Estimate fuel load from lap number
4. Fill missing stint and position values
5. Median imputation + one-hot encoding for categorical features
6. Save Stage 1 (Ridge + polynomial feature bundle), Stage 2 (XGBoost), and the preprocessor for consistent inference

### Model Performance

- **5-Fold CV MAE: ~0.29s** (predicts residual within ~0.3 seconds)
- **R²: 0.95** (explains 95% of lap time variance)

### Honest Assessment

| Aspect | Status | Notes |
|---|---|---|
| Two-stage modeling | Correct | Stage 1 Ridge generalizes across circuits; Stage 2 XGBoost captures lap dynamics |
| Monte Carlo 10K sims | Correct | Right tool for probabilistic "what if" analysis |
| LLM as text formatter only | Correct | Gemini does zero math — just formats the numbers into radio calls |
| Circuit-level Stage 1 dataset | Limitation | Only 10 GPs for the Ridge stage — more data would improve base extrapolation |
| Chaos penalties are hardcoded | Limitation | +15s rain, +40s SC are manual estimates, not learned from data |
| Win probability is circular | Limitation | Compares model output (with noise) against model output (without noise) |
| Model versioning | v2 | Latest trained artifacts stored in `server/models/` with v2 suffix |

### What Would Improve It

1. **More circuit data for Stage 1** — Expanding from 10 to 20+ GPs would make the Ridge base prediction more robust.
2. **Learn chaos penalties from data** — Use historical wet-weather and safety car races to learn actual penalties instead of hardcoding them.
3. **Predict degradation rate, not raw residuals** — Modeling "0.08s slower per lap on softs" is more transferable than raw second-level residuals.

---

## API Endpoints

### WebSocket

| Endpoint | Direction | Payload |
|---|---|---|
| `ws://localhost:8000/ws/chaos` | Client → Server | `{"event": "rain", "compound": "MEDIUM", "current_tire_age": 15, "laps_left": 30}` |
| `ws://localhost:8000/ws/chaos` | Server → Client | `{"event": "rain", "math_results": {...}, "radio_call": "Box box box!..."}` |

### REST (Visualization Data)

| Endpoint | Returns |
|---|---|
| `GET /api/results` | Driver/team metadata (20 drivers) |
| `GET /api/laps` | All lap timing data (~958 laps) |
| `GET /api/weather` | Weather time-series (~156 samples) |
| `GET /api/race-control` | Race control messages (~43 events) |
| `GET /api/track-status` | Flag transitions |
| `GET /api/telemetry` | Circuit shape coordinates (~637 points) |
| `GET /api/health` | Model status, features, compound map |

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
# → Generates server/models/ artifacts (v2 versions)

# Step 3: Start the server
python main.py
# → Server runs at http://localhost:8000
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

- Dynamic weather and full safety car / virtual safety car logic
- Improved tyre degradation models using more advanced inputs
- Full race replays and custom scenario builder
- Player vs. player strategy battles
- Historical tracks and driver/car performance profiles
- Smarter strategy recommendations trained on multi-season race data

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