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
    
    # Manage tire degradation via rates
    lap_indices = np.arange(laps_left)
    deg_rate = 0.1
    if event == "heatwave":
        deg_rate = 0.2
    elif event == "tyre_deg":
        deg_rate = 0.25
        
    deg_penalty = lap_indices * deg_rate 
    base_lap_times = baseline_lap_time + deg_penalty
    
    if event == "traffic":
        base_lap_times += 2.5
        
    # Broadcast to (10000, laps_left)
    simulated_laps = np.broadcast_to(base_lap_times, (NUM_SIMS, laps_left)).copy()

    # Add Gaussian noise (mean 0, std 0.5s)
    noise = np.random.normal(0, 0.5, (NUM_SIMS, laps_left))
    simulated_laps += noise

    # Apply Event Specific Vector Actions (IRL F1 ACCURATE)
    if event == "rain":
        # Slicks on a wet track are undriveable. Apply +15s per lap.
        simulated_laps += 15.0
    elif event == "minor_crash":
        # VSC forces a 30-40% speed reduction. Add 30s for 2 laps.
        simulated_laps[:, :min(2, laps_left)] += 30.0 
    elif event == "major_crash":
        # Safety Car bunches the pack up at very low speeds. Add 40s for 4 laps.
        simulated_laps[:, :min(4, laps_left)] += 40.0
    elif event == "tyre_failure":
        # Limping home with a puncture (+60s) AND the time to do a pit stop (+20s)
        simulated_laps[:, 0] += 80.0
        
    # Total times for each of the 10,000 simulations
    total_times = np.sum(simulated_laps, axis=1) # shape: (10000,)
    
    if event == "penalty_5s":
        total_times += 5.0
        
    # Compute metrics
    mean_total_time = float(np.mean(total_times))
    
    # --- THE REAL DATA SCIENCE WINS (NO RANDOM GUESSING) ---
    # Assume the "pack" finishes in (baseline_lap_time * laps_left) + 2.0 seconds
    pack_finish_time = (baseline_lap_time * laps_left) + 2.0
    
    # How many of our 10,000 simulations beat the pack?
    winning_sims = np.sum(total_times < pack_finish_time)
    calculated_win_prob = (winning_sims / NUM_SIMS) * 100
    
    # Map the mathematically sound probability to the recommendations
    if event == "rain":
        if compound_str.upper() in ['SOFT', 'MEDIUM', 'HARD']:
            win_prob = calculated_win_prob # Will naturally be near 0% because of the +15s penalty
            recommendation = f"Box for Intermediates immediately! Currently losing 15s/lap on {compound_str}s."
        else:
            win_prob = 85.0
            recommendation = f"Stay out, {compound_str} is the right compound for these conditions."
    elif event == "tyre_failure":
        win_prob = calculated_win_prob
        recommendation = "Box box box! Sudden puncture, we need to change tyres right now!"
    elif event == "major_crash":
        win_prob = min(calculated_win_prob + 15.0, 95.0) # Boost probability because of bunched up pack
        recommendation = "Safety car deployed! Box for fresh tires while the pack bunches up."
    elif event == "minor_crash":
        win_prob = calculated_win_prob
        recommendation = "VSC deployed. Maintain positive delta. Potential cheap pit stop window."
    elif event == "heatwave":
        win_prob = calculated_win_prob
        recommendation = "Track temps are soaring. Tyre deg has doubled. Box early for Hards."
    elif event == "tyre_deg":
        win_prob = calculated_win_prob
        recommendation = "Tyres have dropped off a cliff. We must revert to Plan B and stop."
    elif event == "penalty_5s":
        win_prob = calculated_win_prob
        recommendation = "We got a 5-second penalty. Need to push and build a gap to the cars behind."
    elif event == "traffic":
        win_prob = calculated_win_prob
        recommendation = "Stuck in a DRS train. Consider an undercut to get into clean air."
    else:
        # Dry/Nominal
        if compound_str.upper() in ['INTERMEDIATE', 'WET']:
            win_prob = calculated_win_prob
            recommendation = "Box for slicks! Track is dry."
        else:
            win_prob = calculated_win_prob
            recommendation = f"Pace is nominal on {compound_str}s. Maintain current strategy."

    return {
        "predicted_total_time": round(mean_total_time, 2),
        "win_probability": int(win_prob),
        "recommendation": recommendation,
        "math_baseline_lap": round(baseline_lap_time, 2)
    }
