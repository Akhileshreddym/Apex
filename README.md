# APEX — F1 Strategy & Chaos Simulator

**Hacklytics 2026** — A real-time, interactive F1 strategy simulator with a dual-screen architecture.

---

## Architecture

```
┌─────────────────────┐    WebSocket     ┌──────────────────────────────┐    WebSocket     ┌─────────────────────┐
│   iPad (Steward)    │ ──────────────→  │     Python FastAPI Server    │ ──────────────→  │  Laptop (Pit Wall)  │
│   /ipad route       │   chaos event    │                              │   results         │  / route            │
│                     │                  │  XGBoost → Monte Carlo → LLM │                  │                     │
│  Rain | Crash | SC  │                  │                              │                  │  Telemetry Canvas   │
│  buttons            │                  │  /ws/chaos endpoint          │                  │  Timing Board       │
└─────────────────────┘                  └──────────────────────────────┘                  │  Strategy Panel     │
                                                                                           │  Weather / Tires    │
                                                                                           └─────────────────────┘
```

**The Golden Loop:**
1. User taps "Rain" on the iPad
2. Frontend sends `{"event": "rain"}` via WebSocket to FastAPI
3. XGBoost predicts baseline lap time from tire age, compound, position, fuel load
4. NumPy Monte Carlo runs 10,000 simulations with event penalties + Gaussian noise
5. Gemini API formats the math output into a 3-sentence radio call
6. Result is broadcast to all connected Pit Wall clients via WebSocket

---

## Tech Stack

| Layer | Tech | Purpose |
|-------|------|---------|
| Frontend | Next.js App Router, Tailwind CSS | Pit Wall dashboard + iPad chaos console |
| Canvas | HTML5 `<canvas>`, `requestAnimationFrame` | 20-car telemetry animation (zero React state) |
| Backend | Python FastAPI | WebSocket server + REST API |
| ML Model | XGBoost (scikit-learn pipeline) | Baseline lap time prediction |
| Simulation | NumPy vectorized Monte Carlo | 10K race simulations in <0.2s |
| LLM | Gemini API via OpenRouter | Text formatting only (zero math) |
| Data | FastF1 | Historical F1 timing, weather, telemetry |

---

## Project Structure

```
Apex/
├── apex.md                    # Project specification
├── exploration.ipynb          # Data exploration & model comparison notebook
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
│   │   ├── TireDegradation.tsx # Tire wear charts
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
    ├── train_engine.py        # XGBoost model training pipeline
    ├── get_f1_data.py         # FastF1 data extraction script
    ├── f1_tire_data.py        # Tire data fetcher with fallbacks
    ├── feature_engineering.ipynb  # Feature engineering notebook
    ├── engine_v1.joblib       # Trained model (generated)
    ├── preprocessor_v1.joblib # Sklearn pipeline (generated)
    ├── compound_map.json      # Compound encoding map (generated)
    ├── laps_data.csv          # Lap timing data (generated)
    ├── results.csv            # Driver/team metadata (generated)
    ├── weather.csv            # Race weather time-series (generated)
    ├── race_control.csv       # Flags, incidents, penalties (generated)
    ├── track_status.csv       # Green/yellow/SC flag transitions (generated)
    └── telemetry_ui.csv       # Circuit shape telemetry (generated)
```

---

## Data Pipeline

```
get_f1_data.py          train_engine.py           main.py (runtime)
      │                        │                        │
  FastF1 API             laps_data.csv            engine_v1.joblib
      │                        │                   preprocessor_v1.joblib
      ▼                        ▼                        │
 6 CSV files  ──→  train model + pipeline ──→  artifacts loaded at startup
```

### CSV Files Extracted

| File | Rows | Description | Used By |
|------|------|-------------|---------|
| `laps_data.csv` | ~958 | All laps, all 20 drivers, 24 columns | Model training, simulator, timing board |
| `results.csv` | 20 | Driver/team metadata (names, colors, headshots) | DriverCard, CarTimings, TrackCanvas |
| `weather.csv` | ~156 | Air/track temp, humidity, wind, rainfall | WeatherPanel |
| `race_control.csv` | ~43 | Flags, penalties, SC/VSC calls | RaceHistory feed |
| `track_status.csv` | ~3 | Green/yellow/SC flag transitions | Lap filtering for training |
| `telemetry_ui.csv` | ~637 | Fastest lap X/Y/Speed (circuit shape) | TrackCanvas |

### Data Excluded (and why)

| Data | Reason |
|------|--------|
| Full telemetry (all drivers × all laps) | ~10M+ rows — canvas interpolates from lap timing + track shape |
| Position data at 4Hz | Same issue — too large for a hackathon demo |
| Car data (RPM, throttle, brake for all cars) | Only needed for driver analysis, not strategy prediction |
| Q1/Q2/Q3 qualifying times | Qualifying pace ≠ race pace (different fuel, tire management, traffic) |

---

## ML Model Evaluation

### What the Model Does

The XGBoost model predicts **baseline lap time** (in seconds) from 8 features. This baseline feeds into the Monte Carlo simulator, which adds chaos event penalties and Gaussian noise across 10,000 simulations.

### Features (from `exploration.ipynb` findings)

| Feature | Importance | Rationale |
|---------|------------|-----------|
| Stint | Highest | Which tire stint — captures strategy phase |
| Position | High | Dirty air effect (~0.3-0.5s loss following a car) |
| FreshTyre | High | New vs. used tire set — grip difference |
| Compound | Medium | SOFT/MEDIUM/HARD performance profiles |
| LapNumber | Medium | Proxy for fuel load (lighter car = faster) |
| FuelLoad | Medium | Normalized remaining fuel (derived from LapNumber) |
| TyreLife | Medium | Laps on current tire set — degradation |
| AvgSpeed | Low | Mean speed trap reading — car performance |

### Model Performance

- **5-Fold CV MAE: ~0.29s** (predicts lap time within 0.3 seconds)
- **R²: 0.95** (explains 95% of lap time variance)

### Honest Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| XGBoost for tabular data | Correct | Best algorithm for this feature set (validated in exploration.ipynb) |
| Monte Carlo 10K sims | Correct | Right tool for probabilistic "what if" analysis |
| LLM as text formatter only | Correct | Gemini does zero math — just formats the numbers |
| Single-race training data | Limitation | Model trained on 2023 Monza only — can't generalize to other circuits |
| Chaos penalties are hardcoded | Limitation | +15s rain, +40s SC are manual estimates, not learned from data |
| Win probability is circular | Limitation | Compares model output (with noise) against model output (without noise) |

### What Would Improve It

1. **Multi-race training** — Train on 5-10 GPs. Add circuit features (track length, downforce level). Model learns transferable degradation patterns.
2. **Predict degradation rate, not raw lap time** — Instead of predicting ~87s (Monza-specific), predict "0.08s slower per lap on softs" which transfers across circuits.
3. **Learn chaos penalties from data** — Use wet-weather races to learn actual rain penalties instead of hardcoding +15s.

---

## API Endpoints

### WebSocket

| Endpoint | Direction | Payload |
|----------|-----------|---------|
| `ws://localhost:8000/ws/chaos` | Client → Server | `{"event": "rain", "compound": "MEDIUM", "current_tire_age": 15, "laps_left": 30}` |
| `ws://localhost:8000/ws/chaos` | Server → Client | `{"event": "rain", "math_results": {...}, "radio_call": "Box box box!..."}` |

### REST (Visualization Data)

| Endpoint | Returns |
|----------|---------|
| `GET /api/results` | Driver/team metadata (20 drivers) |
| `GET /api/laps` | All lap timing data (958 laps) |
| `GET /api/weather` | Weather time-series (156 samples) |
| `GET /api/race-control` | Race control messages (43 events) |
| `GET /api/track-status` | Flag transitions |
| `GET /api/telemetry` | Circuit shape coordinates (637 points) |
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
pip install fastf1 xgboost scikit-learn fastapi uvicorn python-dotenv pandas numpy requests

# Step 1: Download F1 data (first run needs internet)
python get_f1_data.py

# Step 2: Train the model
python train_engine.py

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
# → iPad console at http://localhost:3000/ipad
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
