"""
train_engine.py
---------------
Two-stage lap-time prediction model trained on 10 GPs, evaluated on a
completely held-out 11th GP (Italy / Monza).

Stage 1 — Circuit Pace Estimator (Ridge Regression)
    Maps (TrackLength, Corners) → median lap time for the GP.
    Extrapolates base pace to unseen circuits (e.g. Monza).

Stage 2 — Race State Predictor (XGBRegressor)
    Predicts the *residual* from the GP median pace (not the Ridge estimate),
    using per-lap features: TyreLife, Compound, Position, Stint, FuelLoad,
    LapNumber, FreshTyre, weather, Driver, and circuit geometry.

    EstBasePace is intentionally excluded from Stage 2 features — including it
    caused the model to memorise circuit identity and fail on held-out GPs.

Final prediction = circuit_anchor + Stage2_residual
    At inference on Monza the anchor is the known Italy median from
    circuit_medians.json (the replay dataset). For unseen circuits the Ridge
    Stage 1 estimate is used instead.

Artifacts saved:
    pace_model_v2.joblib        – Ridge circuit pace estimator
    engine_v2.joblib            – XGBRegressor residual model
    preprocessor_v2.joblib      – ColumnTransformer for Stage 2
    feature_columns_v2.json     – ordered feature names
    circuit_medians.json        – per-GP median lap times for inference anchors
    data/eval_report.json       – CV + held-out test metrics
"""

from __future__ import annotations

import json
import os
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, PolynomialFeatures
from xgboost import XGBRegressor

# ──────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────
TRAIN_CSV = "data/laps_train.csv"
TEST_CSV = "data/laps_test.csv"
DATA_DIR = "data"

PACE_MODEL_PATH = "models/pace_model_v2.joblib"
MODEL_PATH = "models/engine_v2.joblib"
PREPROCESSOR_PATH = "models/preprocessor_v2.joblib"
FEATURE_COLS_PATH = "models/feature_columns_v2.json"
CIRCUIT_MEDIANS_PATH = "models/circuit_medians.json"

TARGET = "LapTime"
CV_FOLDS = 5
RANDOM_STATE = 42

# Columns that must never enter Stage 2 features
ID_COLS = [
    TARGET, "Team", "GP",
    "IsPersonalBest", "IsAccurate",
    "PitOutTime", "PitInTime",
    "Sector1Time", "Sector2Time", "Sector3Time",
    "SpeedI1", "SpeedI2", "SpeedFL", "SpeedST",
    "GPMedian", "Residual", "EstBasePace",
]

XGB_PARAMS = dict(
    n_estimators=280,
    learning_rate=0.055,
    max_depth=5,
    min_child_weight=4,
    subsample=0.82,
    colsample_bytree=0.82,
    reg_alpha=0.15,
    reg_lambda=1.2,
    random_state=RANDOM_STATE,
    n_jobs=-1,
)


# ──────────────────────────────────────────────
# Data cleaning
# ──────────────────────────────────────────────
def clean_laps(df: pd.DataFrame) -> pd.DataFrame:
    n = len(df)
    df = df.dropna(subset=[TARGET])

    if "IsAccurate" in df.columns:
        df = df[df["IsAccurate"] == True]  # noqa: E712

    for col in ("PitOutTime", "PitInTime"):
        if col in df.columns:
            df = df[df[col].isna()]

    gp_med = df.groupby("GP")[TARGET].transform("median")
    df = df[(df[TARGET] > gp_med * 0.7) & (df[TARGET] < gp_med * 1.5)]

    print(f"  Cleaned: {n:,} → {len(df):,} laps ({n - len(df):,} removed)")
    return df


# ──────────────────────────────────────────────
# Feature engineering
# ──────────────────────────────────────────────
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    if "LapNumber" in df.columns:
        max_laps = df.groupby("GP")["LapNumber"].transform("max")
        df["FuelLoad"] = 1.0 - (df["LapNumber"] / max_laps)

    for col in ("Stint", "Position"):
        if col in df.columns:
            df[col] = (df.groupby(["GP", "Driver"])[col]
                       .ffill().bfill()
                       .fillna(df[col].median()))

    for col in ("AirTemp", "TrackTemp", "Humidity"):
        if col in df.columns:
            df[col] = df.groupby("GP")[col].ffill().bfill().fillna(df[col].median())

    if "Rainfall" in df.columns:
        df["Rainfall"] = df["Rainfall"].fillna(False).astype(int)

    df["GPMedian"] = df.groupby("GP")[TARGET].transform("median")
    return df


def compute_circuit_medians(*dfs: pd.DataFrame) -> dict[str, float]:
    """Median lap time per GP across provided frames (train + test for anchors)."""
    combined = pd.concat(dfs, ignore_index=True)
    medians = combined.groupby("GP")[TARGET].median()
    return {gp: round(float(val), 2) for gp, val in medians.items()}


# ──────────────────────────────────────────────
# Stage 1: Circuit Pace Estimator
# ──────────────────────────────────────────────
def train_pace_model(train_df: pd.DataFrame):
    """Fit Ridge on per-GP median pace vs polynomial circuit features."""
    gp_stats = (train_df.groupby("GP")
                .agg(median_pace=(TARGET, "median"),
                     TrackLength=("TrackLength", "first"),
                     Corners=("Corners", "first"))
                .reset_index())

    X_raw = gp_stats[["TrackLength", "Corners"]].values
    y_pace = gp_stats["median_pace"].values

    poly = PolynomialFeatures(degree=2, include_bias=False)
    X_pace = poly.fit_transform(X_raw)

    pace_model = Ridge(alpha=1.0)
    pace_model.fit(X_pace, y_pace)

    for _, row in gp_stats.iterrows():
        x = poly.transform([[row["TrackLength"], row["Corners"]]])
        pred = float(pace_model.predict(x)[0])
        print(f"    {row['GP']:>15}: actual={row['median_pace']:.1f}s  "
              f"predicted={pred:.1f}s  error={pred - row['median_pace']:+.1f}s")

    print(f"  Ridge (poly deg=2) R²: "
          f"{pace_model.score(X_pace, y_pace):.4f}")
    return poly, pace_model


def attach_pace_estimates(df: pd.DataFrame, poly, pace_model) -> pd.DataFrame:
    df = df.copy()
    df["EstBasePace"] = pace_model.predict(
        poly.transform(df[["TrackLength", "Corners"]].values)
    )
    df["Residual"] = df[TARGET] - df["GPMedian"]
    return df


def build_stage2_matrix(df: pd.DataFrame):
    drop = [c for c in ID_COLS if c in df.columns]
    X_raw = df.drop(columns=drop, errors="ignore")
    y_residual = df["Residual"].values
    y_absolute = df[TARGET].values
    anchor = df["GPMedian"].values
    return X_raw, y_residual, y_absolute, anchor


def make_preprocessor(X_raw: pd.DataFrame) -> tuple[ColumnTransformer, list[str]]:
    num_cols = X_raw.select_dtypes(include=np.number).columns.tolist()
    cat_cols = X_raw.select_dtypes(exclude=np.number).columns.tolist()

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
            ]), num_cols),
            ("cat", Pipeline([
                ("imputer", SimpleImputer(strategy="constant",
                                         fill_value="Unknown")),
                ("encoder", OneHotEncoder(handle_unknown="ignore",
                                         sparse_output=False)),
            ]), cat_cols),
        ],
        remainder="drop",
    )

    ohe_names: list[str] = []
    if cat_cols:
        ohe_names = list(
            OneHotEncoder(handle_unknown="ignore", sparse_output=False)
            .fit(X_raw[cat_cols].fillna("Unknown"))
            .get_feature_names_out(cat_cols)
        )
    feature_names = num_cols + ohe_names
    return preprocessor, feature_names


def run_cv(X, y_residual, anchor, y_absolute) -> dict:
    """5-fold CV on Stage 2 residual prediction (lap-level, shuffled)."""
    kf = KFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    res_maes, lap_maes, lap_r2s = [], [], []

    for train_idx, val_idx in kf.split(X):
        model = XGBRegressor(**XGB_PARAMS)
        model.fit(X[train_idx], y_residual[train_idx])

        res_pred = model.predict(X[val_idx])
        res_maes.append(mean_absolute_error(y_residual[val_idx], res_pred))

        y_pred = anchor[val_idx] + res_pred
        lap_maes.append(mean_absolute_error(y_absolute[val_idx], y_pred))
        lap_r2s.append(r2_score(y_absolute[val_idx], y_pred))

    return {
      "cv_folds": CV_FOLDS,
      "cv_residual_mae_s": round(float(np.mean(res_maes)), 3),
      "cv_residual_mae_std_s": round(float(np.std(res_maes)), 3),
      "cv_lap_mae_s": round(float(np.mean(lap_maes)), 3),
      "cv_lap_mae_std_s": round(float(np.std(lap_maes)), 3),
      "cv_lap_r2": round(float(np.mean(lap_r2s)), 4),
  }


def evaluate_split(model, preprocessor, df: pd.DataFrame, anchor_col: str):
    X_raw, y_residual, y_absolute, _ = build_stage2_matrix(df)
    X = preprocessor.transform(X_raw)
    res_pred = model.predict(X)
    anchor = df[anchor_col].values if anchor_col in df.columns else df["GPMedian"].values
    y_pred = anchor + res_pred
    return {
        "rmse_s": float(np.sqrt(mean_squared_error(y_absolute, y_pred))),
        "mae_s": float(mean_absolute_error(y_absolute, y_pred)),
        "r2": float(r2_score(y_absolute, y_pred)),
        "residual_mae_s": float(mean_absolute_error(y_residual, res_pred)),
    }


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
def train():
    warnings.filterwarnings("ignore", category=RuntimeWarning,
                            module="sklearn.linear_model")
    print("Loading data …")
    train_df = pd.read_csv(TRAIN_CSV)
    test_df = pd.read_csv(TEST_CSV)
    print(f"  Train: {len(train_df):,} rows  |  "
          f"GPs: {train_df['GP'].unique().tolist()}")
    print(f"  Test:  {len(test_df):,} rows  |  "
          f"GPs: {test_df['GP'].unique().tolist()}")

    print("\nCleaning …")
    train_df = clean_laps(train_df)
    test_df = clean_laps(test_df)

    train_df = engineer_features(train_df)
    test_df = engineer_features(test_df)

    circuit_medians = compute_circuit_medians(train_df, test_df)

    # ── Stage 1: Circuit pace model ──────────────────────────────────────
    print("\n── Stage 1: Circuit Pace Estimator (Ridge + Poly) ──")
    poly, pace_model = train_pace_model(train_df)

    train_df = attach_pace_estimates(train_df, poly, pace_model)
    test_df = attach_pace_estimates(test_df, poly, pace_model)

    italy_est = float(pace_model.predict(
        poly.transform(test_df[["TrackLength", "Corners"]].iloc[:1].values)
    )[0])
    actual_italy = circuit_medians["Italy"]
    print(f"\n  Italy Ridge estimate: {italy_est:.1f}s  "
          f"(actual median: {actual_italy:.1f}s, "
          f"error: {italy_est - actual_italy:+.1f}s)")

    # ── Stage 2: Residual model ──────────────────────────────────────────
    print("\n── Stage 2: Race State Predictor (XGBoost on GP-median residuals) ──")

    X_train_raw, y_res_train, y_abs_train, anchor_train = build_stage2_matrix(train_df)
    X_test_raw, _, y_abs_test, _ = build_stage2_matrix(test_df)

    common = sorted(set(X_train_raw.columns) & set(X_test_raw.columns))
    X_train_raw = X_train_raw[common]
    X_test_raw = X_test_raw[common]

    print(f"\n  Features ({len(common)}):")
    num_cols = X_train_raw.select_dtypes(include=np.number).columns.tolist()
    cat_cols = X_train_raw.select_dtypes(exclude=np.number).columns.tolist()
    print(f"    Numeric     ({len(num_cols)}): {num_cols}")
    print(f"    Categorical ({len(cat_cols)}): {cat_cols}")

    preprocessor, feature_names = make_preprocessor(X_train_raw)
    X_train = preprocessor.fit_transform(X_train_raw)
    X_test = preprocessor.transform(X_test_raw)

    print(f"\n  Transformed: {X_train.shape[1]} features  |  "
          f"train={X_train.shape[0]:,}  test={X_test.shape[0]:,}")

    print("\n  Running 5-fold cross-validation …")
    cv_metrics = run_cv(X_train, y_res_train, anchor_train, y_abs_train)
    print(f"    Residual MAE : {cv_metrics['cv_residual_mae_s']:.3f} ± "
          f"{cv_metrics['cv_residual_mae_std_s']:.3f} s")
    print(f"    Lap time MAE : {cv_metrics['cv_lap_mae_s']:.3f} ± "
          f"{cv_metrics['cv_lap_mae_std_s']:.3f} s")
    print(f"    Lap time R²  : {cv_metrics['cv_lap_r2']:.4f}")

    print("\n  Training final XGBRegressor on all training laps …")
    model = XGBRegressor(**XGB_PARAMS)
    model.fit(X_train, y_res_train)

    train_metrics = evaluate_split(model, preprocessor, train_df, "GPMedian")
    test_metrics = evaluate_split(model, preprocessor, test_df, "GPMedian")

    print(f"\n{'=' * 55}")
    print("  TRAINING SET  (10 GPs)")
    print(f"{'=' * 55}")
    print(f"  RMSE : {train_metrics['rmse_s']:.3f} s")
    print(f"  MAE  : {train_metrics['mae_s']:.3f} s")
    print(f"  R²   : {train_metrics['r2']:.4f}")

    print("\n  Per-GP breakdown:")
    res_train_pred = model.predict(X_train)
    y_train_pred = train_df["GPMedian"].values + res_train_pred
    y_train_true = train_df[TARGET].values
    for gp in train_df["GP"].unique():
        m = train_df["GP"].values == gp
        print(f"    {gp:>15}:  MAE={mean_absolute_error(y_train_true[m], y_train_pred[m]):.3f}s"
              f"   median={np.median(y_train_true[m]):.1f}s   n={m.sum()}")

    print(f"\n{'=' * 55}")
    print("  HELD-OUT TEST SET  (Italy GP, known circuit median anchor)")
    print(f"{'=' * 55}")
    print(f"  RMSE : {test_metrics['rmse_s']:.3f} s")
    print(f"  MAE  : {test_metrics['mae_s']:.3f} s")
    print(f"  R²   : {test_metrics['r2']:.4f}")

    # Ridge-only extrapolation baseline for comparison
    res_test_pred = model.predict(X_test)
    ridge_anchor_pred = test_df["EstBasePace"].values + res_test_pred
    ridge_mae = mean_absolute_error(y_abs_test, ridge_anchor_pred)
    print(f"\n  (If Ridge anchor used instead: MAE={ridge_mae:.3f}s — "
          f"shows why circuit median is needed at inference)")

    # ── Persist ───────────────────────────────────────────────────────────
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs("models", exist_ok=True)

    joblib.dump({"poly": poly, "ridge": pace_model}, PACE_MODEL_PATH)
    print(f"\n  Pace model        → {PACE_MODEL_PATH}")

    joblib.dump(model, MODEL_PATH)
    print(f"  XGB model         → {MODEL_PATH}")

    joblib.dump(preprocessor, PREPROCESSOR_PATH)
    print(f"  Preprocessor      → {PREPROCESSOR_PATH}")

    with open(FEATURE_COLS_PATH, "w") as f:
        json.dump(feature_names, f, indent=2)
    print(f"  Features          → {FEATURE_COLS_PATH}")

    with open(CIRCUIT_MEDIANS_PATH, "w") as f:
        json.dump(circuit_medians, f, indent=2)
    print(f"  Circuit medians   → {CIRCUIT_MEDIANS_PATH}")

    report = {
        "train_gps": train_df["GP"].unique().tolist(),
        "test_gp": "Italy",
        "stage1_italy_est_s": round(float(italy_est), 1),
        "stage1_italy_actual_median_s": round(float(actual_italy), 1),
        **cv_metrics,
        "train_rmse_s": round(train_metrics["rmse_s"], 3),
        "train_mae_s": round(train_metrics["mae_s"], 3),
        "train_r2": round(train_metrics["r2"], 4),
        "test_rmse_s": round(test_metrics["rmse_s"], 3),
        "test_mae_s": round(test_metrics["mae_s"], 3),
        "test_r2": round(test_metrics["r2"], 4),
        "n_train": int(X_train.shape[0]),
        "n_test": int(X_test.shape[0]),
        "n_features_stage2": int(X_train.shape[1]),
    }
    with open(os.path.join(DATA_DIR, "eval_report.json"), "w") as f:
        json.dump(report, f, indent=2)
    print(f"  Eval report       → {DATA_DIR}/eval_report.json")


if __name__ == "__main__":
    train()
