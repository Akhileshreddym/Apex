import numpy as np
import json
import os
import joblib

model = None
compound_map = None

def load_resources():
    global model, compound_map
    try:
        if os.path.exists('compound_map.json'):
            with open('compound_map.json', 'r') as f:
                compound_map = json.load(f)
        else:
            print("Warning: compound_map.json not found")
        
        if os.path.exists('engine_v1.joblib'):
            model = joblib.load('engine_v1.joblib')
        else:
            print("Warning: engine_v1.joblib not found")
            return False
        return True
    except Exception as e:
        print(f"Error loading resources: {e}")
        return False

# Initialize on load
load_resources()

def run_monte_carlo(current_tire_age, compound_str, laps_left, event=None):
    if not model or not compound_map:
        if not load_resources():
            return {
                "predicted_total_time": 0,
                "win_probability": 0,
                "recommendation": "Error: Model not loaded."
            }

    # Encode compound
    compound_enc = compound_map.get(str(compound_str).upper(), 0.0)

    # 1. Ask Model for baseline lap time
    X_base = np.array([[current_tire_age, compound_enc]])
    baseline_lap_time = float(model.predict(X_base)[0])

    # 2. NumPy Vectorized Monte Carlo (10,000 simulations x laps_left)
    NUM_SIMS = 10000
    
    # Base array of simulated laps
    # Manage tire degradation via rates
    lap_indices = np.arange(laps_left)
    deg_rate = 0.1
    if event == "heatwave":
        deg_rate = 0.2
    elif event == "tyre_deg":
        deg_rate = 0.25
        
    deg_penalty = lap_indices * deg_rate # shape: (laps_left,)
    
    # Base times per lap: shape (laps_left,)
    base_lap_times = baseline_lap_time + deg_penalty
    
    if event == "traffic":
        base_lap_times += 2.5
        
    # Broadcast to (10000, laps_left)
    simulated_laps = np.broadcast_to(base_lap_times, (NUM_SIMS, laps_left)).copy()

    # Add Gaussian noise (mean 0, std 0.5s)
    noise = np.random.normal(0, 0.5, (NUM_SIMS, laps_left))
    simulated_laps += noise

    # Apply Event Specific Vector Actions
    if event == "rain":
        simulated_laps += 15.0
    elif event == "minor_crash":
        # VSC / Debris - limit to first 3 laps or up to laps_left
        simulated_laps[:, :min(3, laps_left)] += 1.0 
    elif event == "major_crash":
        # SC - slow for 5 laps
        simulated_laps[:, :min(5, laps_left)] += 5.0
    elif event == "tyre_failure":
        simulated_laps[:, 0] += 60.0
        
    # Total times for each of the 10,000 simulations
    total_times = np.sum(simulated_laps, axis=1) # shape: (10000,)
    
    if event == "penalty_5s":
        total_times += 5.0
        
    # Compute metrics
    mean_total_time = float(np.mean(total_times))
    
    # Win probability estimation based on logic
    if event == "rain":
        if compound_str.upper() in ['SOFT', 'MEDIUM', 'HARD']:
            win_prob = np.random.uniform(5, 15)
            recommendation = f"Box for Intermediates immediately! Currently losing 15s/lap on {compound_str}s."
        else:
            win_prob = np.random.uniform(70, 90)
            recommendation = f"Stay out, {compound_str} is the right compound for these conditions."
    elif event == "tyre_failure":
        win_prob = np.random.uniform(1, 5)
        recommendation = "Box box box! Sudden puncture, we need to change tyres right now!"
    elif event == "major_crash":
        win_prob = np.random.uniform(15, 30)
        recommendation = "Safety car deployed! Box for fresh tires while the pack bunches up."
    elif event == "minor_crash":
        win_prob = np.random.uniform(30, 45)
        recommendation = "VSC deployed. Maintain positive delta. Potential cheap pit stop window."
    elif event == "heatwave":
        win_prob = np.random.uniform(40, 50)
        recommendation = "Track temps are soaring. Tyre deg has doubled. Box early for Hards."
    elif event == "tyre_deg":
        win_prob = np.random.uniform(20, 40)
        recommendation = "Tyres have dropped off a cliff. We must revert to Plan B and stop."
    elif event == "penalty_5s":
        win_prob = np.random.uniform(35, 45)
        recommendation = "We got a 5-second penalty. Need to push and build a gap to the cars behind."
    elif event == "traffic":
        win_prob = np.random.uniform(30, 50)
        recommendation = "Stuck in a DRS train. Consider an undercut to get into clean air."
    else:
        # Dry/Nominal
        if compound_str.upper() in ['INTERMEDIATE', 'WET']:
            win_prob = np.random.uniform(1, 10)
            recommendation = "Box for slicks! Track is dry."
        else:
            win_prob = np.random.uniform(40, 60)
            recommendation = f"Pace is nominal on {compound_str}s. Maintain current strategy."

    return {
        "predicted_total_time": round(mean_total_time, 2),
        "win_probability": int(win_prob),
        "recommendation": recommendation,
        "math_baseline_lap": round(baseline_lap_time, 2)
    }
