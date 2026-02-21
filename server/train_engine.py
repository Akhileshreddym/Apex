"""
train_engine.py
---------------
Preprocessing pipeline for the Apex F1 lap-time model.

Steps
-----
1. Load laps_data.csv.
2. Parse LapTime → LapTime_Sec (seconds).  Rows where LapTime_Sec is NaN are dropped
   because the target variable itself is missing — that is the only mandatory drop.
3. Compute per-column null statistics and save data/missing_report_italy_2023_r.csv.
4. Drop feature columns whose null_pct > NULL_PCT_THRESHOLD (default 90 %).
5. Impute remaining columns:
       numeric     → median
       categorical → 'Unknown'
6. One-hot encode categorical columns (handle_unknown='ignore').
7. Train an XGBoost regressor on the processed matrix.
8. Save:
       engine_v1.joblib          – trained model
       preprocessor_v1.joblib   – fitted sklearn ColumnTransformer pipeline
       feature_columns_v1.json  – list of column names fed to the model
"""

import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBRegressor

# ──────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────
DATA_DIR = "data"                          # directory for reports
MISSING_REPORT_PATH = os.path.join(DATA_DIR, "missing_report_italy_2023_r.csv")
NULL_PCT_THRESHOLD = 0.90                  # drop columns with > 90 % nulls

MODEL_PATH = "engine_v1.joblib"
PREPROCESSOR_PATH = "preprocessor_v1.joblib"
FEATURE_COLS_PATH = "feature_columns_v1.json"

TARGET_COL = "LapTime_Sec"


# ──────────────────────────────────────────────
# Helper utilities
# ──────────────────────────────────────────────
def parse_laptime(series: pd.Series) -> pd.Series:
    """Convert FastF1 timedelta strings or numeric seconds → float seconds."""
    try:
        return pd.to_timedelta(series).dt.total_seconds()
    except Exception:
        return pd.to_numeric(series, errors="coerce")


def compute_missing_report(df: pd.DataFrame) -> pd.DataFrame:
    """Return a DataFrame with per-column null statistics."""
    report = pd.DataFrame({
        "column":     df.columns,
        "dtype":      [str(df[c].dtype) for c in df.columns],
        "null_count": [int(df[c].isna().sum()) for c in df.columns],
        "null_pct":   [round(df[c].isna().mean(), 6) for c in df.columns],
        "n_unique":   [int(df[c].nunique(dropna=False)) for c in df.columns],
    })
    return report


# ──────────────────────────────────────────────
# Main training function
# ──────────────────────────────────────────────
def train():
    # 1. Load raw data
    try:
        df = pd.read_csv("laps_data.csv")
    except Exception as e:
        print(f"Error loading laps_data.csv: {e}")
        return

    print(f"Loaded {len(df):,} rows × {df.shape[1]} columns.")

    # 2. Parse target; drop rows where target is unavailable (only mandatory drop)
    df[TARGET_COL] = parse_laptime(df["LapTime"])
    df = df.dropna(subset=[TARGET_COL])
    print(f"After dropping rows with missing LapTime_Sec: {len(df):,} rows remain.")

    # Feature DataFrame (everything except source LapTime and the derived target)
    feature_df = df.drop(columns=["LapTime", TARGET_COL], errors="ignore")

    # 3. Compute and save missing report
    report = compute_missing_report(feature_df)
    os.makedirs(DATA_DIR, exist_ok=True)
    report.to_csv(MISSING_REPORT_PATH, index=False)
    print(f"Missing report saved → {MISSING_REPORT_PATH}")
    print(report.to_string(index=False))

    # 4. Drop high-null columns
    high_null_cols = report.loc[report["null_pct"] > NULL_PCT_THRESHOLD, "column"].tolist()
    if high_null_cols:
        print(f"\nDropping {len(high_null_cols)} column(s) with null_pct > {NULL_PCT_THRESHOLD:.0%}: {high_null_cols}")
        feature_df = feature_df.drop(columns=high_null_cols)
    else:
        print(f"\nNo columns exceed the null_pct threshold of {NULL_PCT_THRESHOLD:.0%}.")

    # 5 & 6. Identify numeric vs. categorical columns, build preprocessing pipeline
    numeric_cols = feature_df.select_dtypes(include=np.number).columns.tolist()
    categorical_cols = feature_df.select_dtypes(exclude=np.number).columns.tolist()

    print(f"\nNumeric features   : {numeric_cols}")
    print(f"Categorical features: {categorical_cols}")

    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
    ])

    categorical_pipeline = Pipeline([
        ("imputer",  SimpleImputer(strategy="constant", fill_value="Unknown")),
        ("encoder",  OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, numeric_cols),
            ("cat", categorical_pipeline, categorical_cols),
        ],
        remainder="drop",
    )

    # Fit-transform features
    X = preprocessor.fit_transform(feature_df)

    # Derive the final list of feature names for inference
    ohe_feature_names: list[str] = []
    if categorical_cols:
        ohe = preprocessor.named_transformers_["cat"].named_steps["encoder"]
        ohe_feature_names = list(ohe.get_feature_names_out(categorical_cols))
    feature_names = numeric_cols + ohe_feature_names

    y = df[TARGET_COL].values
    print(f"\nFinal feature matrix: {X.shape[0]:,} rows × {X.shape[1]} features.")

    # 7. Train XGBoost
    print("Training XGBRegressor…")
    model = XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X, y)
    print("Training complete.")

    # 8. Persist model, preprocessor, and feature column list
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved          → {MODEL_PATH}")

    joblib.dump(preprocessor, PREPROCESSOR_PATH)
    print(f"Preprocessor saved   → {PREPROCESSOR_PATH}")

    with open(FEATURE_COLS_PATH, "w") as f:
        json.dump(feature_names, f, indent=2)
    print(f"Feature list saved   → {FEATURE_COLS_PATH}")


if __name__ == "__main__":
    train()