"""
get_f1_data.py
--------------
Downloads lap data from 11 GPs (10 for training, 1 held-out test)
and exports CSV files for the ML pipeline + JSON files for the frontend UI.

Training GPs (10): chosen to span the full range of circuit types
    — corner counts from 10 (Austria) to 27 (Saudi Arabia)
    — track lengths from 4.259 km (Netherlands) to 7.004 km (Belgium)

Test GP (1): Italy / Monza — the race the demo replays, completely held out.

Circuit metadata (TrackLength, Corners) is attached to every lap so the
model can learn to generalise across tracks rather than memorising one.
"""

import fastf1
import json
import math
import pandas as pd
import os

if not os.path.exists("cache"):
    os.makedirs("cache")
fastf1.Cache.enable_cache("cache")

WEB_LIB = os.path.join(os.path.dirname(__file__), "..", "web", "lib")
AVG_LAP_SEC = 86  # Monza average lap time for time→lap conversion

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


def _to_seconds(val):
    """Convert a timedelta or numeric value to float seconds."""
    if hasattr(val, "total_seconds"):
        return val.total_seconds()
    try:
        return float(val)
    except (TypeError, ValueError):
        return 0.0


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


# ── JSON export helpers for the frontend ──────────────────────────────────

def _export_weather_json(weather_df, path):
    """Convert session.weather_data → weather_data.json"""
    records = []
    for _, row in weather_df.iterrows():
        records.append({
            "Time": round(_to_seconds(row.get("Time", 0)), 3),
            "AirTemp": float(row.get("AirTemp", 0)),
            "Humidity": float(row.get("Humidity", 0)),
            "Pressure": float(row.get("Pressure", 0)),
            "Rainfall": bool(row.get("Rainfall", False)),
            "TrackTemp": float(row.get("TrackTemp", 0)),
            "WindDirection": int(row.get("WindDirection", 0)),
            "WindSpeed": float(row.get("WindSpeed", 0)),
        })
    with open(path, "w") as f:
        json.dump(records, f, separators=(",", ":"))
    return len(records)


def _export_race_events_json(rc_df, path):
    """Convert session.race_control_messages → race_events_data.json"""
    skip_prefixes = ("ROLLING START", "GREEN LIGHT", "CAR", "BLACK AND WHITE")
    events = []
    idx = 0
    for _, row in rc_df.iterrows():
        msg = str(row.get("Message", "")).strip()
        if not msg:
            continue
        msg_upper = msg.upper()
        if any(msg_upper.startswith(p) for p in skip_prefixes):
            pass  # keep these — they're informative (deleted laps, flags)

        time_sec = _to_seconds(row.get("Time", 0))
        lap = max(1, round(time_sec / AVG_LAP_SEC))
        flag = str(row.get("Flag", ""))
        cat = str(row.get("Category", ""))

        if "YELLOW" in flag or "YELLOW" in msg_upper:
            etype = "flag"
        elif "SAFETY" in msg_upper or cat == "SafetyCar":
            etype = "incident"
        elif "INCIDENT" in cat.upper() or "INVESTIGATION" in msg_upper or "PENALTY" in msg_upper:
            etype = "incident"
        elif "DRS" in msg_upper or "BLUE FLAG" in msg_upper or "DELETED" in msg_upper:
            etype = "flag"
        elif "RAIN" in msg_upper or "WEATHER" in msg_upper:
            etype = "weather"
        elif "PIT" in msg_upper:
            etype = "pit"
        else:
            etype = "strategy"

        idx += 1
        events.append({
            "id": f"rc{idx}",
            "LapNumber": lap,
            "Time": round(time_sec, 3),
            "type": etype,
            "description": msg,
        })
    with open(path, "w") as f:
        json.dump(events, f, indent=2)
    return len(events)


def _export_track_status_json(ts_df, path):
    """Convert session.track_status → track_status_data.json"""
    records = []
    for _, row in ts_df.iterrows():
        time_sec = _to_seconds(row.get("Time", 0))
        records.append({
            "Time": round(time_sec, 3),
            "Status": int(row.get("Status", 1)),
            "Message": str(row.get("Message", "AllClear")),
            "Lap": max(1, round(time_sec / AVG_LAP_SEC)),
        })
    with open(path, "w") as f:
        json.dump(records, f, indent=2)
    return len(records)


def _export_telemetry_json(session, path):
    """Fastest-lap telemetry → monza.json (track shape with speed)."""
    fastest = session.laps.pick_fastest()
    telem = fastest.get_telemetry()
    points = []
    for _, row in telem.iterrows():
        x = row.get("X")
        y = row.get("Y")
        spd = row.get("Speed", 0)
        if pd.isna(x) or pd.isna(y):
            continue
        points.append({
            "x": round(float(x), 2),
            "y": round(float(y), 2),
            "speed": round(float(spd), 2),
        })

    # Subsample to ~600-700 points for smooth rendering without bloat
    total = len(points)
    if total > 700:
        step = math.ceil(total / 650)
        points = [points[i] for i in range(0, total, step)]

    with open(path, "w") as f:
        json.dump(points, f, indent=2)
    return len(points)


def main():
    os.makedirs(WEB_LIB, exist_ok=True)
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

            # ── Frontend JSON files (saved to web/lib/) ──────────────
            n = _export_weather_json(
                session.weather_data,
                os.path.join(WEB_LIB, "weather_data.json"))
            print(f"  weather_data.json      ({n} samples)")

            n = _export_race_events_json(
                session.race_control_messages,
                os.path.join(WEB_LIB, "race_events_data.json"))
            print(f"  race_events_data.json  ({n} events)")

            n = _export_track_status_json(
                session.track_status,
                os.path.join(WEB_LIB, "track_status_data.json"))
            print(f"  track_status_data.json ({n} entries)")

            n = _export_telemetry_json(
                session,
                os.path.join(WEB_LIB, "monza.json"))
            print(f"  monza.json             ({n} points)")

    # ── Combine and persist (ML training data stays as CSV) ───────────
    train_df = pd.concat(train_frames, ignore_index=True)
    train_df.to_csv("data/laps_train.csv", index=False)
    print(f"\nlaps_train.csv  → {len(train_df):,} laps from "
          f"{train_df['GP'].nunique()} GPs")

    test_df = pd.concat(test_frames, ignore_index=True)
    test_df.to_csv("datalaps_test.csv", index=False)
    print(f"laps_test.csv   → {len(test_df):,} laps from "
          f"{test_df['GP'].nunique()} GP(s)")

    print("\nDone.")


if __name__ == "__main__":
    main()
