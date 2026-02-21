import fastf1
import pandas as pd
import os

# Create cache directory to prevent API rate limits
if not os.path.exists('cache'):
    os.makedirs('cache')

fastf1.Cache.enable_cache('cache')

print("🛰️ Downloading 2023 Zandvoort Race Data...")
session = fastf1.get_session(2023, 'Zandvoort', 'R')
session.load()

# 1. Strategy Data for the Monte Carlo Engine
print("📊 Extracting Laps...")
laps = session.laps
math_data = laps[['Driver', 'LapNumber', 'LapTime', 'TyreLife', 'Compound', 'PitOutTime']]
# Save for the math engine
math_data.to_csv('laps_data.csv', index=False)

# 2. Telemetry Data for the Frontend Canvas
print("🏎️ Extracting Telemetry for the Map...")
# Getting Max Verstappen's telemetry as the baseline UI path
car_data = session.laps.pick_driver('VER').pick_laps(range(1, 10)).get_telemetry()
ui_data = car_data[['X', 'Y', 'Speed', 'nGear']]
ui_data.to_csv('telemetry_ui.csv', index=False)

print("✅ Data Ready. Send 'telemetry_ui.csv' to Dev 2.")
