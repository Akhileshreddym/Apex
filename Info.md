# Apex — File Map & Purpose Reference

> Full audit of every file in the repository, organized by directory.
> Files marked with **UNUSED** or **DUPLICATE** are safe to delete.
> **Backend commands** (`get_f1_data.py`, `train_engine.py`, `test_ws.py`, `main.py`) are intended to be run from the **`server/`** directory so relative paths (`data/`, `models/`) resolve correctly.

---

## Root Directory

| File | Purpose | Status |
|------|---------|--------|
| `README.md` | Main project documentation — architecture, tech stack, data pipeline, ML evaluation, setup instructions, design system | Active (docs) |
| `Commands.md` | Quick-reference for CLI commands: data sourcing (`python get_f1_data.py`), training (`python train_engine.py`), WebSocket test (`python test_ws.py`), backend (`python main.py`), frontend (`npm run dev`). Access points: judge UI (port 3000), iPad panel (/ipad), chaos WebSocket (port 8000) | Active (docs) |
| `Instructions.md` | AI assistant coding directives — project context, the "Golden Loop" event flow, strict coding rules (no React state for animation, vectorized Monte Carlo, etc.) | Active (docs) |
| `Info.md` | This file — complete map of every file and its role in the codebase | Active (docs) |
| `.gitignore` | Excludes `node_modules`, `dist`, `build`, `out`, `venv`, `**/data`, `**/logs`, `**/cache`, `__pycache__`, `.ipynb_checkpoints`, `.env`, `.next`, `documentation/`, and FastF1 cache from version control | Active (config) |

---

## `documentation/`

| File | Purpose | Status |
|------|---------|--------|
| `end-to-end model diff gp analysis.md` | Deep technical writeup of the full system — data pipeline, two-stage model architecture, Monte Carlo engine, error analysis across GPs | Active (docs) |
| `model on different gp.md` | Analysis of why the model was expanded from single-GP to multi-GP training, and the impact on generalization | Active (docs) |

*Note: `documentation/` is listed in `.gitignore`; these files may exist only locally.*

---

## `server/` — Python Backend

### Core Runtime (loaded when backend starts)

| File | Purpose | Imported By | Status |
|------|---------|-------------|--------|
| `main.py` | FastAPI entry point. WebSocket endpoint `/ws/chaos` receives iPad events, calls Monte Carlo simulator, generates LLM radio calls via OpenRouter, broadcasts results | — (entry point) | **Active** |
| `simulator.py` | Two-stage Monte Carlo strategy engine. Stage 1: Ridge regression estimates Monza base pace from circuit features. Stage 2: XGBoost predicts residual. Loads artifacts from `models/`; runs 10,000 vectorized NumPy simulations | `main.py` | **Active** |
| `requirements.txt` | Python dependencies — FastAPI, uvicorn, scikit-learn, xgboost, joblib, numpy, pandas, fastf1, python-dotenv, requests, websockets | `pip install -r requirements.txt` | **Active** |

### Model Artifacts (in `server/models/`)

| File | Purpose | Used By | Status |
|------|---------|---------|--------|
| `models/pace_model_v2.joblib` | Stage 1 — polynomial transformer + Ridge regressor (TrackLength, Corners → median lap time) | `simulator.py`, `train_engine.py` | **Active** |
| `models/engine_v2.joblib` | Stage 2 — trained XGBRegressor for lap time residual prediction | `simulator.py`, `train_engine.py` | **Active** |
| `models/preprocessor_v2.joblib` | ColumnTransformer that encodes Compound and scales numeric features before XGBoost | `simulator.py`, `train_engine.py` | **Active** |
| `models/feature_columns_v2.json` | JSON array of 10 feature names (EstBasePace, FreshTyre, FuelLoad, LapNumber, Position, Stint, TyreLife, Compound_*) | `simulator.py`, `train_engine.py` | **Active** |

### Standalone Scripts (run manually from `server/`)

| File | Purpose | Status |
|------|---------|--------|
| `get_f1_data.py` | Fetches F1 data via FastF1 for 11 GPs (10 train, 1 test Italy). Writes **`data/laps_train.csv`** and **`data/laps_test.csv`** (ensure `server/data/` exists or run from `server/`). Exports to **`web/lib/`**: `weather_data.json`, `race_events_data.json`, `track_status_data.json`, `monza.json` (Italy only) | **Active** (run once) |
| `train_engine.py` | Reads `data/laps_train.csv` and `data/laps_test.csv`; trains two-stage model; writes `models/*.joblib`, `models/feature_columns_v2.json`, and `data/eval_report.json` | **Active** (run once) |
| `test_ws.py` | WebSocket test client — connects to `ws://127.0.0.1:8000/ws/chaos` and fires all 8 chaos events sequentially to verify the backend pipeline | **Active** (testing) |

### Training Data (in `server/data/`)

| File | Purpose | Status |
|------|---------|--------|
| `data/laps_train.csv` | Laps from 10 train GPs with full feature set (LapTime, TyreLife, Compound, Position, Stint, sectors, speed traps, TrackLength, Corners). ~9.3k laps | **Active** — read by `train_engine.py` |
| `data/laps_test.csv` | Held-out Italy GP laps (~878); never used during training | **Active** — read by `train_engine.py` |

*`**/data` is in `.gitignore`; these CSVs are local-only unless explicitly force-added.*

### Data Reports

| File | Purpose | Status |
|------|---------|--------|
| `data/eval_report.json` | Model evaluation: train GPs, test GP Italy, test RMSE/MAE/R², n_train, n_test, stage1 estimates | **Active** (reference) |
| `data/missing_report_italy_2023_r.csv` | Data quality report (null counts per column for Italy GP). From old notebook; not used by runtime or training | **UNUSED** — safe to delete |

### Unused / Duplicate Files

| File | Why It's Unused | Recommendation |
|------|-----------------|----------------|
| `notebooks/feature_engineering.ipynb` | Notebook references **v1** artifacts; current pipeline is `train_engine.py` (v2). Exploratory only | **UNUSED** — keep for reference or delete |
| `package-lock.json` | Empty npm lockfile. Server is pure Python — no Node dependencies | **UNUSED** — safe to delete |

---

## `web/` — Next.js Frontend

*Frontend commands (`npm run dev`, `npm run build`) are run from the `web/` directory.*

### Config Files

| File | Purpose | Status |
|------|---------|--------|
| `package.json` | Node dependencies (Next.js 15, React 19, Tailwind CSS 4) and scripts (`dev`, `build`, `start`, `lint`) | **Active** |
| `package-lock.json` | Pinned dependency tree for reproducible installs | **Active** |
| `tsconfig.json` | TypeScript config with `@/*` path alias mapping to project root | **Active** |
| `next.config.ts` | Next.js config — React strict mode enabled | **Active** |
| `tailwind.config.ts` | Custom Apex design system — `apex-bg`, `apex-card`, `apex-red`, `apex-cyan`, `apex-green` colors, `pulse-glow` and `slide-in` animations | **Active** |
| `postcss.config.mjs` | PostCSS plugins — Tailwind CSS + Autoprefixer | **Active** |
| `next-env.d.ts` | Auto-generated Next.js TypeScript declarations | **Active** (auto-managed) |
| `tsconfig.tsbuildinfo` | TypeScript incremental build cache | **Active** (auto-managed) |
| `README.md` | Minimal README | Docs |

### `app/` — Pages & Layout

| File | Purpose | Imports | Status |
|------|---------|---------|--------|
| `app/layout.tsx` | Root layout — sets HTML metadata ("APEX — F1 Pit Wall"), imports `globals.css`, wraps all pages | `globals.css` | **Active** |
| `app/globals.css` | Global CSS — Tailwind directives, CSS custom properties for the Apex dark theme, scrollbar styling, `pulse-glow` keyframes | — | **Active** |
| `app/page.tsx` | **Main dashboard (Screen 1 — Laptop)**. 2-column grid layout with header bar (lap counter, WS status), AI radio call banner, 8 component panels, and a status ticker footer | All 7 components, `ChaosContext`, `mock-data` | **Active** |
| `app/ipad/page.tsx` | **Chaos controller (Screen 2 — iPad)**. 8 large tactile buttons (Rain, Minor Crash, Major Crash, Heatwave, Tyre Failure, Traffic, Penalty 5s, Tyre Deg) that send WebSocket events to the backend | `types`, `useWebSocket` | **Active** |

### `components/` — UI Components

| Component | Purpose | Data Source | Used By |
|-----------|---------|-------------|---------|
| `TrackCanvas.tsx` | HTML5 Canvas animation of the Monza circuit. Draws track from GPS coordinates, animates 20 car dots, tracks lap count, shows yellow flag visual (amber track tint + badge) during caution | `monza.json`, `timing_data.json`, `mock-data.trackStatusForLap` | `page.tsx` |
| `CarTimings.tsx` | Live timing leaderboard. Simulates lap-by-lap race progression — pace variation, tire degradation, pit stops, chaos event effects, yellow flag slowdown (uniform pace, no overtaking). Sorts by cumulative time for position changes | `mock-data.mockTimingData`, `mock-data.trackStatusForLap`, `ChaosContext` | `page.tsx` |
| `DriverCard.tsx` | Focus card for the lead driver — photo, team color bar, current tire compound, stint number, sector times, gap to P2, best lap | `mock-data`, `format` | `page.tsx` |
| `PitWindow.tsx` | Pit strategy visualization — optimal window range (laps 33-38), undercut/overcut delta, pit loss time, responsive to chaos events | `mock-data.mockPitWindow`, `ChaosContext` | `page.tsx` |
| `WeatherPanel.tsx` | Current weather conditions + 4-lap forecast strip. Dynamically updates based on `currentLap` using real Monza 2023 weather data | `mock-data.weatherForLap`, `mock-data.weatherForecastForLap`, `ChaosContext` | `page.tsx` |
| `TireDegradation.tsx` | Canvas chart plotting tire grip percentage vs. lap number. Adjusts degradation curve based on chaos events (heatwave, rain, tyre_deg) | `mock-data.mockTireDeg`, `ChaosContext` | `page.tsx` |
| `StrategyPanel.tsx` | Monte Carlo strategy recommendations with priority badges (critical/high/medium), win probability bars, and compound recommendations. Updates live when chaos results arrive | `mock-data.mockStrategies`, `ChaosContext` | `page.tsx` |
| `RaceHistory.tsx` | Scrollable race feed showing all events — real FIA race control messages + live chaos events injected from iPad. Color-coded by type (pit, overtake, incident, weather, strategy, flag) | `mock-data.raceEvents`, `ChaosContext` | `page.tsx` |

### `lib/` — Shared Logic & Data

| File | Purpose | Used By | Status |
|------|---------|---------|--------|
| `ChaosContext.tsx` | React Context + Provider managing global chaos state: current event, Monte Carlo math results, AI radio call text, event history, weather overrides, tire deg modifier, time penalties. Connects to `ws://localhost:8000/ws/chaos` | `page.tsx`, all 7 components via `useChaos()` | **Active** |
| `useWebSocket.ts` | Custom React hook for WebSocket connections with auto-reconnect (1s retry), JSON message parsing, and connection status tracking | `ChaosContext.tsx`, `app/ipad/page.tsx` | **Active** |
| `types.ts` | Full TypeScript type definitions matching FastF1 data structures — `TimingData`, `WeatherSample`, `RaceEvent`, `TrackStatusEntry`, `TireCompound`, `ChaosEvent`, `StrategyRec`, `PitWindowData`, etc. | `mock-data.ts`, `RaceHistory.tsx`, `StrategyPanel.tsx`, `ipad/page.tsx` | **Active** |
| `format.ts` | Formatting utilities — `formatLapTime` (seconds → "M:SS.mmm"), `formatSectorTime`, `degreesToCardinal` (wind direction), `formatSessionTime` | `CarTimings.tsx`, `DriverCard.tsx`, `RaceHistory.tsx`, `WeatherPanel.tsx` | **Active** |
| `mock-data.ts` | Central data hub. Imports all JSON data files, exports typed constants and lookup functions: `mockTimingData`, `weatherForLap()`, `weatherForecastForLap()`, `raceEvents`, `trackStatusForLap()`, `mockPitWindow`, `mockStrategies`, `mockTireDeg`, `TIRE_COLORS` | Nearly every component | **Active** |

### `lib/` — JSON Data Files (2023 Italian GP / Monza)

| File | Contents | Source | Used By |
|------|----------|--------|---------|
| `timing_data.json` | 20 drivers' timing snapshot at lap 31 — position, gaps, sector times, tire compound/life, pit count | Static snapshot or separate export; **not** generated by `get_f1_data.py` | `mock-data.ts`, `TrackCanvas.tsx` |
| `weather_data.json` | Weather time-series across the race (~60s intervals) — air/track temp, humidity, pressure, rainfall, wind | FastF1 `session.weather_data` → `get_f1_data.py` → `web/lib/` | `mock-data.ts` |
| `race_events_data.json` | FIA race control messages — flags, incidents, penalties, track limits, DRS | FastF1 `session.race_control_messages` → `get_f1_data.py` → `web/lib/` | `mock-data.ts` |
| `track_status_data.json` | Track status transitions (e.g. AllClear, Yellow Flag by lap) | FastF1 `session.track_status` → `get_f1_data.py` → `web/lib/` | `mock-data.ts` |
| `monza.json` | GPS points tracing Monza circuit shape, with speed at each point | FastF1 fastest-lap telemetry → `get_f1_data.py` → `web/lib/` | `TrackCanvas.tsx` |

### `public/`

| File | Purpose | Status |
|------|---------|--------|
| `driver_ver.png` | Max Verstappen headshot photo displayed in `DriverCard.tsx` | **Active** |

---

## Data Flow Summary

```
FastF1 API
    │
    ▼
get_f1_data.py (run from server/)
    ├──► server/data/laps_train.csv + laps_test.csv
    │            │
    │            ▼
    │     train_engine.py ──► server/models/*.joblib, feature_columns_v2.json
    │                    ──► server/data/eval_report.json
    │
    ├──► web/lib/weather_data.json
    ├──► web/lib/race_events_data.json
    ├──► web/lib/track_status_data.json
    └──► web/lib/monza.json

iPad (web app: /ipad)
    │  WebSocket event
    ▼
main.py ──► simulator.py (loads models/) ──► Monte Carlo ──► OpenRouter LLM
    │
    ▼  WebSocket broadcast
ChaosContext.tsx ──► All dashboard components
```

---

## Files Safe to Delete

| File | Reason |
|------|--------|
| `server/notebooks/feature_engineering.ipynb` | References v1 artifacts; current pipeline is `train_engine.py` (v2). Outdated exploratory notebook |
| `server/package-lock.json` | Empty npm lockfile. Server is pure Python — no Node.js needed |
| `server/data/missing_report_italy_2023_r.csv` | Data quality report from old notebook; not used by runtime or training |
