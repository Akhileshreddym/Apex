"""
train_engine.py
---------------
Two-stage lap-time prediction model trained on 10 GPs, evaluated on a
completely held-out 11th GP (Italy / Monza).

Stage 1 — Circuit Pace Estimator (Ridge Regression)
    Maps (TrackLength, Corners) → median lap time for the GP.
    Only 10 data points but a strong linear relationship, and crucially
    a linear model CAN extrapolate to unseen circuits.

Stage 2 — Race State Predictor (XGBRegressor)
    Predicts the *residual* from the estimated base pace, using per-lap
    features: TyreLife, Compound, Position, Stint, FuelLoad, LapNumber,
    FreshTyre, and the Stage 1 estimate itself.

Final prediction = Stage1_estimate + Stage2_residual

Artifacts saved:
    pace_model_v2.joblib        – Ridge circuit pace estimator
    engine_v2.joblib            – XGBRegressor residual model
    preprocessor_v2.joblib      – ColumnTransformer for Stage 2
    feature_columns_v2.json     – ordered feature names
    data/eval_report.json       – held-out test metrics
"""

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

TARGET = "LapTime"

# Identifiers and columns that should not be features
ID_COLS = [
    TARGET, "Driver", "Team", "GP",
    "IsPersonalBest", "IsAccurate",
    "PitOutTime", "PitInTime",
    "Sector1Time", "Sector2Time", "Sector3Time",
    "SpeedI1", "SpeedI2", "SpeedFL", "SpeedST",
]


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

    return df


# ──────────────────────────────────────────────
# Stage 1: Circuit Pace Estimator
# ──────────────────────────────────────────────
def train_pace_model(train_df: pd.DataFrame):
    """Fit Ridge on per-GP median pace vs polynomial circuit features.

    Returns (poly_transformer, ridge_model) so both can be applied at
    inference time.
    """
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

    # ── Stage 1: Circuit pace model ──────────────────────────────────────
    print("\n── Stage 1: Circuit Pace Estimator (Ridge + Poly) ──")
    poly, pace_model = train_pace_model(train_df)

    italy_est = float(pace_model.predict(
        poly.transform(test_df[["TrackLength", "Corners"]].iloc[:1].values)
    )[0])
    actual_italy = test_df[TARGET].median()
    print(f"\n  Italy estimate: {italy_est:.1f}s  "
          f"(actual median: {actual_italy:.1f}s, "
          f"error: {italy_est - actual_italy:+.1f}s)")

    # Add estimated base pace as a feature for Stage 2
    train_df["EstBasePace"] = pace_model.predict(
        poly.transform(train_df[["TrackLength", "Corners"]].values)
    )
    test_df["EstBasePace"] = pace_model.predict(
        poly.transform(test_df[["TrackLength", "Corners"]].values)
    )

    # Compute residual target for Stage 2
    train_df["Residual"] = train_df[TARGET] - train_df["EstBasePace"]
    test_df["Residual"] = test_df[TARGET] - test_df["EstBasePace"]

    # ── Stage 2: Residual model ──────────────────────────────────────────
    print("\n── Stage 2: Race State Predictor (XGBoost on residuals) ──")

    y_train = train_df["Residual"].values
    y_test = test_df["Residual"].values

    drop = [c for c in ID_COLS + ["Residual", "TrackLength", "Corners"]
            if c in train_df.columns]
    X_train_raw = train_df.drop(columns=drop, errors="ignore")
    X_test_raw = test_df.drop(columns=drop, errors="ignore")

    common = sorted(set(X_train_raw.columns) & set(X_test_raw.columns))
    X_train_raw = X_train_raw[common]
    X_test_raw = X_test_raw[common]

    num_cols = X_train_raw.select_dtypes(include=np.number).columns.tolist()
    cat_cols = X_train_raw.select_dtypes(exclude=np.number).columns.tolist()

    print(f"\n  Features ({len(common)}):")
    print(f"    Numeric     ({len(num_cols)}): {num_cols}")
    print(f"    Categorical ({len(cat_cols)}): {cat_cols}")

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

    X_train = preprocessor.fit_transform(X_train_raw)
    X_test = preprocessor.transform(X_test_raw)

    ohe_names: list[str] = []
    if cat_cols:
        ohe = preprocessor.named_transformers_["cat"].named_steps["encoder"]
        ohe_names = list(ohe.get_feature_names_out(cat_cols))
    feature_names = num_cols + ohe_names

    print(f"\n  Transformed: {X_train.shape[1]} features  |  "
          f"train={X_train.shape[0]:,}  test={X_test.shape[0]:,}")

    print("\n  Training XGBRegressor on residuals …")
    model = XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # ── Final evaluation (absolute lap time) ─────────────────────────────
    # Reconstruct absolute predictions: EstBasePace + predicted_residual
    res_train_pred = model.predict(X_train)
    y_train_abs = train_df["EstBasePace"].values + res_train_pred
    y_train_true = train_df[TARGET].values

    res_test_pred = model.predict(X_test)
    y_test_abs = test_df["EstBasePace"].values + res_test_pred
    y_test_true = test_df[TARGET].values

    print(f"\n{'=' * 55}")
    print("  TRAINING SET  (10 GPs)")
    print(f"{'=' * 55}")
    print(f"  RMSE : {np.sqrt(mean_squared_error(y_train_true, y_train_abs)):.3f} s")
    print(f"  MAE  : {mean_absolute_error(y_train_true, y_train_abs):.3f} s")
    print(f"  R²   : {r2_score(y_train_true, y_train_abs):.4f}")

    print(f"\n  Per-GP breakdown:")
    for gp in train_df["GP"].unique():
        m = train_df["GP"].values == gp
        print(f"    {gp:>15}:  MAE={mean_absolute_error(y_train_true[m], y_train_abs[m]):.3f}s"
              f"   median={np.median(y_train_true[m]):.1f}s   n={m.sum()}")

    rmse = np.sqrt(mean_squared_error(y_test_true, y_test_abs))
    mae = mean_absolute_error(y_test_true, y_test_abs)
    r2 = r2_score(y_test_true, y_test_abs)

    print(f"\n{'=' * 55}")
    print("  HELD-OUT TEST SET  (Italy GP)")
    print(f"{'=' * 55}")
    print(f"  RMSE : {rmse:.3f} s")
    print(f"  MAE  : {mae:.3f} s")
    print(f"  R²   : {r2:.4f}")

    # ── Persist ───────────────────────────────────────────────────────────
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs("models", exist_ok=True)

    joblib.dump({"poly": poly, "ridge": pace_model}, PACE_MODEL_PATH)
    print(f"\n  Pace model   → {PACE_MODEL_PATH}")

    joblib.dump(model, MODEL_PATH)
    print(f"  XGB model    → {MODEL_PATH}")

    joblib.dump(preprocessor, PREPROCESSOR_PATH)
    print(f"  Preprocessor → {PREPROCESSOR_PATH}")

    with open(FEATURE_COLS_PATH, "w") as f:
        json.dump(feature_names, f, indent=2)
    print(f"  Features     → {FEATURE_COLS_PATH}")

    report = {
        "train_gps": train_df["GP"].unique().tolist(),
        "test_gp": "Italy",
        "stage1_italy_est_s": round(float(italy_est), 1),
        "stage1_italy_actual_median_s": round(float(actual_italy), 1),
        "test_rmse_s": round(rmse, 3),
        "test_mae_s": round(mae, 3),
        "test_r2": round(r2, 4),
        "n_train": int(X_train.shape[0]),
        "n_test": int(X_test.shape[0]),
        "n_features_stage2": int(X_train.shape[1]),
    }
    with open(os.path.join(DATA_DIR, "eval_report.json"), "w") as f:
        json.dump(report, f, indent=2)
    print(f"  Eval report  → {DATA_DIR}/eval_report.json")


if __name__ == "__main__":
    train()
