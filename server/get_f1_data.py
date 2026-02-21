"""
get_f1_data.py
--------------
Downloads lap data from 11 GPs (10 for training, 1 held-out test)
and exports CSV files for the ML pipeline and frontend UI.

Training GPs (10): chosen to span the full range of circuit types
    — corner counts from 10 (Austria) to 27 (Saudi Arabia)
    — track lengths from 4.259 km (Netherlands) to 7.004 km (Belgium)

Test GP (1): Italy / Monza — the race the demo replays, completely held out.

Circuit metadata (TrackLength, Corners) is attached to every lap so the
model can learn to generalise across tracks rather than memorising one.
"""

import fastf1
import pandas as pd
import os

if not os.path.exists("cache"):
    os.makedirs("cache")
fastf1.Cache.enable_cache("cache")

# ── Race definitions ─────────────────────────────────────────────────────
# 10 training circuits selected for diversity in layout and speed profile.
# Austria (10 corners) is critical — without it, Monza's 11 corners would
# be below the training range, forcing XGBoost to extrapolate (which it
# cannot do).
RACES = [
    {"year": 2023, "gp": "Bahrain",       "track_km": 5.412, "corners": 15, "split": "train"},
    {"year": 2023, "gp": "Saudi Arabia",   "track_km": 6.174, "corners": 27, "split": "train"},
    {"year": 2023, "gp": "Australia",      "track_km": 5.278, "corners": 14, "split": "train"},
    {"year": 2023, "gp": "Miami",          "track_km": 5.412, "corners": 19, "split": "train"},
    {"year": 2023, "gp": "Spain",          "track_km": 4.675, "corners": 16, "split": "train"},
    {"year": 2023, "gp": "Austria",        "track_km": 4.318, "corners": 10, "split": "train"},
    {"year": 2023, "gp": "Great Britain",  "track_km": 5.891, "corners": 18, "split": "train"},
    {"year": 2023, "gp": "Hungary",        "track_km": 4.381, "corners": 14, "split": "train"},
    {"year": 2023, "gp": "Belgium",        "track_km": 7.004, "corners": 19, "split": "train"},
    {"year": 2023, "gp": "Japan",          "track_km": 5.807, "corners": 18, "split": "train"},
    # Held-out test race
    {"year": 2023, "gp": "Italy",          "track_km": 5.793, "corners": 11, "split": "test"},
]

LAP_COLS = [
    "Driver", "LapNumber", "LapTime", "TyreLife", "Compound",
    "PitOutTime", "PitInTime",
    "Sector1Time", "Sector2Time", "Sector3Time",
    "SpeedI1", "SpeedI2", "SpeedFL", "SpeedST",
    "IsPersonalBest", "FreshTyre", "Team",
    "Position", "IsAccurate", "Stint",
]

TIMEDELTA_COLS = [
    "LapTime", "PitOutTime", "PitInTime",
    "Sector1Time", "Sector2Time", "Sector3Time",
    "LapStartTime", "Time",
]


def _td_to_sec(series: pd.Series) -> pd.Series:
    try:
        return pd.to_timedelta(series).dt.total_seconds()
    except Exception:
        return pd.to_numeric(series, errors="coerce")


def extract_laps(session, race: dict) -> pd.DataFrame:
    laps = session.laps
    available = [c for c in LAP_COLS if c in laps.columns]
    df = laps[available].copy()

    for col in TIMEDELTA_COLS:
        if col in df.columns:
            df[col] = _td_to_sec(df[col])

    if "FreshTyre" in df.columns:
        df["FreshTyre"] = df["FreshTyre"].astype(int)

    df["GP"] = race["gp"]
    df["TrackLength"] = race["track_km"]
    df["Corners"] = race["corners"]
    return df


def _save_timedelta_csv(df: pd.DataFrame, path: str):
    out = df.copy()
    for col in out.columns:
        if pd.api.types.is_timedelta64_dtype(out[col]):
            out[col] = out[col].dt.total_seconds()
    out.to_csv(path, index=False)


def main():
    train_frames, test_frames = [], []

    for race in RACES:
        tag = f"{race['year']} {race['gp']}"
        print(f"\n{'=' * 55}")
        print(f"  {tag}  [{race['split'].upper()}]")
        print(f"{'=' * 55}")

        session = fastf1.get_session(race["year"], race["gp"], "R")
        session.load()

        df = extract_laps(session, race)
        print(f"  {len(df):,} laps extracted")

        if race["split"] == "train":
            train_frames.append(df)
        else:
            test_frames.append(df)

            # ── UI data for the test race (Italy / Monza) ────────────
            session.results.to_csv("results.csv", index=False)
            print(f"  results.csv          ({len(session.results)} rows)")

            _save_timedelta_csv(session.weather_data, "weather.csv")
            print(f"  weather.csv          ({len(session.weather_data)} rows)")

            _save_timedelta_csv(session.race_control_messages, "race_control.csv")
            print(f"  race_control.csv     ({len(session.race_control_messages)} rows)")

            _save_timedelta_csv(session.track_status, "track_status.csv")
            print(f"  track_status.csv     ({len(session.track_status)} rows)")

            fastest = session.laps.pick_fastest()
            telem = fastest.get_telemetry()
            keep = [c for c in ["X", "Y", "Z", "Speed", "nGear", "Distance",
                                "Throttle", "Brake"] if c in telem.columns]
            telem[keep].to_csv("telemetry_ui.csv", index=False)
            print(f"  telemetry_ui.csv     ({len(telem)} rows)")

    # ── Combine and persist ──────────────────────────────────────────────
    train_df = pd.concat(train_frames, ignore_index=True)
    train_df.to_csv("laps_train.csv", index=False)
    print(f"\nlaps_train.csv  → {len(train_df):,} laps from "
          f"{train_df['GP'].nunique()} GPs")

    test_df = pd.concat(test_frames, ignore_index=True)
    test_df.to_csv("laps_test.csv", index=False)
    print(f"laps_test.csv   → {len(test_df):,} laps from "
          f"{test_df['GP'].nunique()} GP(s)")

    print("\nDone.")


if __name__ == "__main__":
    main()
