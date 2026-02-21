import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
import joblib
import json

def train():
    try:
        df = pd.read_csv('laps_data.csv')
    except Exception as e:
        print(f"Error loading laps_data.csv: {e}")
        return

    # Clean data
    df = df.dropna(subset=['LapTime', 'TyreLife', 'Compound'])
    
    # FastF1 lap times can be formatted as strings '0 days 00:01:15.123000' in CSV
    # Convert to seconds
    try:
        df['LapTime_Sec'] = pd.to_timedelta(df['LapTime']).dt.total_seconds()
    except Exception:
        # Fallback if it's already numeric or another format
        df['LapTime_Sec'] = pd.to_numeric(df['LapTime'], errors='coerce')
        
    df = df.dropna(subset=['LapTime_Sec'])

    # Map compounds
    compounds = df['Compound'].unique()
    compound_map = {str(c).upper(): float(i) for i, c in enumerate(compounds)}
    
    # Save compound map for simulator
    with open('compound_map.json', 'w') as f:
        json.dump(compound_map, f)

    df['Compound_encoded'] = df['Compound'].astype(str).str.upper().map(compound_map)

    X = df[['TyreLife', 'Compound_encoded']].values  # Use .values to train on raw array, avoiding warnings later
    y = df['LapTime_Sec'].values

    print("Training HistGradientBoostingRegressor...")
    model = HistGradientBoostingRegressor(max_iter=100, learning_rate=0.1, max_depth=5)
    model.fit(X, y)

    joblib.dump(model, 'engine_v1.joblib')
    print("Model saved to engine_v1.joblib")

if __name__ == "__main__":
    train()