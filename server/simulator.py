from __future__ import annotations
"""
simulator.py
------------
Vectorised Monte Carlo strategy engine (two-stage model).

Stage 1: Ridge regression estimates Monza's base pace from circuit features.
Stage 2: XGBoost predicts the residual (how much faster/slower than base)
         given the current race state (tire, position, fuel, etc.).

Final lap time = Stage1_base + Stage2_residual

All 10,000 simulations run in pure NumPy — zero for-loops in the math.
"""

import json
import os

import joblib
import numpy as np
import pandas as pd

# ── Model artifacts ───────────────────────────────────────────────────────
poly_tf = None
pace_ridge = None
xgb_model = None
preprocessor = None
feature_cols = None

# Monza constants
MONZA_TRACK_KM = 5.793
MONZA_CORNERS = 11
MONZA_TOTAL_LAPS = 53
MONZA_EST_PACE = None  # computed from pace model on load


def load_resources():
    global poly_tf, pace_ridge, xgb_model, preprocessor, feature_cols, MONZA_EST_PACE
    try:
        for path in ("models/pace_model_v2.joblib",
                     "models/engine_v2.joblib",
                     "models/preprocessor_v2.joblib"):
            if not os.path.exists(path):
                print(f"Warning: {path} not found")
                return False

        pace_bundle = joblib.load("models/pace_model_v2.joblib")
        poly_tf = pace_bundle["poly"]
        pace_ridge = pace_bundle["ridge"]
        xgb_model = joblib.load("models/engine_v2.joblib")
        preprocessor = joblib.load("models/preprocessor_v2.joblib")

        X_monza = poly_tf.transform([[MONZA_TRACK_KM, MONZA_CORNERS]])
        MONZA_EST_PACE = float(pace_ridge.predict(X_monza)[0])
        print(f"Monza estimated base pace: {MONZA_EST_PACE:.1f}s")

        if os.path.exists("models/feature_columns_v2.json"):
            with open("models/feature_columns_v2.json") as f:
                feature_cols = json.load(f)

        return True
    except Exception as e:
        print(f"Error loading resources: {e}")
        return False


load_resources()


def _build_input_row(tire_age: int,
                     compound: str,
                     lap_number: int,
                     position: int = 10,
                     stint: int = 1,
                     fresh_tyre: bool = False) -> pd.DataFrame:
    """Build a single-row DataFrame matching the Stage 2 preprocessor."""
    total = MONZA_TOTAL_LAPS
    return pd.DataFrame([{
        "EstBasePace": MONZA_EST_PACE,
        "FreshTyre": int(fresh_tyre),
        "FuelLoad": 1.0 - (lap_number / total),
        "LapNumber": lap_number,
        "Position": position,
        "Stint": stint,
        "TyreLife": tire_age,
        "Compound": compound.upper(),
    }])


# ── Public API ────────────────────────────────────────────────────────────

def run_monte_carlo(current_tire_age: int,
                    compound_str: str,
                    laps_left: int,
                    event: str | None = None,
                    position: int = 10,
                    stint: int = 1,
                    fresh_tyre: bool = False):
    if xgb_model is None or preprocessor is None or MONZA_EST_PACE is None:
        if not load_resources():
            return {
                "predicted_total_time": 0,
                "win_probability": 0,
                "recommendation": "Error: Model not loaded.",
            }

    current_lap = MONZA_TOTAL_LAPS - laps_left

    # 1. Two-stage prediction for baseline lap time
    row = _build_input_row(current_tire_age, compound_str, current_lap,
                           position, stint, fresh_tyre)
    X = preprocessor.transform(row)
    residual = float(xgb_model.predict(X)[0])
    baseline_lap_time = MONZA_EST_PACE + residual

    # 2. Vectorised Monte Carlo — 10 000 sims x laps_left laps
    NUM_SIMS = 10_000
    lap_idx = np.arange(laps_left)

    deg_rate = 0.1
    if event == "heatwave":
        deg_rate = 0.2
    elif event == "tyre_deg":
        deg_rate = 0.25

    base = baseline_lap_time + lap_idx * deg_rate
    if event == "traffic":
        base += 2.5

    sims = np.broadcast_to(base, (NUM_SIMS, laps_left)).copy()
    sims += np.random.normal(0, 0.5, sims.shape)

    if event == "rain":
        sims += 15.0
    elif event == "minor_crash":
        sims[:, :min(2, laps_left)] += 30.0
    elif event == "major_crash":
        sims[:, :min(4, laps_left)] += 40.0
    elif event == "tyre_failure":
        sims[:, 0] += 80.0

    totals = np.sum(sims, axis=1)
    if event == "penalty_5s":
        totals += 5.0

    mean_total = float(np.mean(totals))
    pack_finish = baseline_lap_time * laps_left + 2.0
    calc_wp = float(np.sum(totals < pack_finish) / NUM_SIMS * 100)

    wp, rec = _strategy_call(event, compound_str, calc_wp)

    return {
        "predicted_total_time": round(mean_total, 2),
        "win_probability": int(wp),
        "recommendation": rec,
        "math_baseline_lap": round(baseline_lap_time, 2),
    }


def _strategy_call(event, compound, calc_wp):
    c = compound.upper()
    if event == "rain":
        if c in ("SOFT", "MEDIUM", "HARD"):
            return calc_wp, f"Box for Intermediates immediately! Losing 15s/lap on {compound}s."
        return 85.0, f"Stay out, {compound} is right for these conditions."
    if event == "tyre_failure":
        return calc_wp, "Box box box! Sudden puncture, change tyres now!"
    if event == "major_crash":
        return min(calc_wp + 15.0, 95.0), "Safety car deployed! Box for fresh tires."
    if event == "minor_crash":
        return calc_wp, "VSC deployed. Maintain positive delta. Cheap pit window."
    if event == "heatwave":
        return calc_wp, "Track temps soaring. Tyre deg doubled. Box early for Hards."
    if event == "tyre_deg":
        return calc_wp, "Tyres dropped off. Revert to Plan B, stop now."
    if event == "penalty_5s":
        return calc_wp, "5-second penalty. Push hard, build gap to cars behind."
    if event == "traffic":
        return calc_wp, "DRS train. Consider undercut for clean air."
    if c in ("INTERMEDIATE", "WET"):
        return calc_wp, "Box for slicks! Track is dry."
    return calc_wp, f"Pace nominal on {compound}s. Maintain strategy."
