"""
f1_tire_data.py
---------------
Helper module to fetch tire data (tire age, compound, laps left) from F1 sources.
Supports both live fastf1 sessions and historical data fallback.
"""

import os
import pandas as pd
import fastf1
from typing import Optional, Dict, Any

# Enable cache for fastf1
if not os.path.exists('cache'):
    os.makedirs('cache')
fastf1.Cache.enable_cache('cache')

# Default race parameters (can be overridden)
DEFAULT_TOTAL_LAPS = 53  # Typical F1 race length (varies by track)
DEFAULT_DRIVER = "VER"  # Default driver to track

def get_tire_data_from_f1_session(
    year: int = 2023,
    location: str = "Italy",
    session_type: str = "R",
    driver: str = DEFAULT_DRIVER
) -> Optional[Dict[str, Any]]:
    """
    Attempts to fetch current tire data from a fastf1 session.
    
    Returns:
        Dict with keys: current_tire_age, compound_str, laps_left, current_lap
        Returns None if session cannot be loaded or driver not found
    """
    try:
        session = fastf1.get_session(year, location, session_type)
        session.load()
        
        # Get the latest lap data for the specified driver
        driver_laps = session.laps.pick_driver(driver)
        if driver_laps.empty:
            print(f"⚠️  Driver {driver} not found in session")
            return None
        
        # Get the most recent lap
        latest_lap = driver_laps.iloc[-1]
        
        # Extract tire data
        current_tire_age = int(latest_lap['TyreLife']) if pd.notna(latest_lap['TyreLife']) else None
        compound_str = str(latest_lap['Compound']).upper() if pd.notna(latest_lap['Compound']) else None
        current_lap = int(latest_lap['LapNumber']) if pd.notna(latest_lap['LapNumber']) else None
        
        # Calculate laps left (total race laps - current lap)
        # Get total race distance from session info, or use max lap number from data
        driver_laps_data = session.laps.pick_driver(driver)
        max_lap = int(driver_laps_data['LapNumber'].max()) if not driver_laps_data.empty else None
        laps_left = max(0, max_lap - current_lap) if (current_lap and max_lap) else None
        
        if current_tire_age is None or compound_str is None or laps_left is None:
            return None
        
        return {
            "current_tire_age": current_tire_age,
            "compound_str": compound_str,
            "laps_left": laps_left,
            "current_lap": current_lap
        }
    except Exception as e:
        print(f"⚠️  Error loading F1 session: {e}")
        return None


def get_tire_data_from_csv(
    csv_path: str = "laps_data.csv",
    driver: str = DEFAULT_DRIVER,
    target_lap: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Fetches tire data from historical CSV data.
    
    Args:
        csv_path: Path to laps_data.csv
        driver: Driver abbreviation (e.g., "VER")
        target_lap: Specific lap number to use. If None, uses the latest lap.
    
    Returns:
        Dict with keys: current_tire_age, compound_str, laps_left, current_lap
        Returns None if CSV not found or driver not found
    """
    try:
        if not os.path.exists(csv_path):
            print(f"⚠️  CSV file {csv_path} not found")
            return None
        
        df = pd.read_csv(csv_path)
        
        # Filter by driver
        driver_data = df[df['Driver'] == driver]
        if driver_data.empty:
            print(f"⚠️  Driver {driver} not found in CSV")
            return None
        
        # Use target_lap or latest lap
        if target_lap:
            lap_data = driver_data[driver_data['LapNumber'] == target_lap]
            if lap_data.empty:
                print(f"⚠️  Lap {target_lap} not found for driver {driver}")
                return None
            latest_lap = lap_data.iloc[-1]
        else:
            latest_lap = driver_data.iloc[-1]
        
        # Extract tire data
        current_tire_age = int(latest_lap['TyreLife']) if pd.notna(latest_lap['TyreLife']) else None
        compound_str = str(latest_lap['Compound']).upper() if pd.notna(latest_lap['Compound']) else None
        current_lap = int(latest_lap['LapNumber']) if pd.notna(latest_lap['LapNumber']) else None
        
        # Calculate laps left
        max_lap = int(driver_data['LapNumber'].max())
        laps_left = max(0, max_lap - current_lap) if current_lap else None
        
        if current_tire_age is None or compound_str is None or laps_left is None:
            return None
        
        return {
            "current_tire_age": current_tire_age,
            "compound_str": compound_str,
            "laps_left": laps_left,
            "current_lap": current_lap
        }
    except Exception as e:
        print(f"⚠️  Error reading CSV: {e}")
        return None


def estimate_tire_data_from_race_state(
    current_lap: int = 20,
    total_laps: int = DEFAULT_TOTAL_LAPS,
    compound: str = "MEDIUM"
) -> Dict[str, any]:
    """
    Estimates tire data based on race state when F1 data is unavailable.
    
    Logic:
    - Tire age: Assumes fresh tires at start, increments with laps
    - Compound: Uses provided compound or defaults to MEDIUM
    - Laps left: Calculated from total_laps - current_lap
    
    Args:
        current_lap: Current lap number in the race
        total_laps: Total number of laps in the race
        compound: Tire compound (SOFT, MEDIUM, HARD, etc.)
    
    Returns:
        Dict with estimated tire data
    """
    # Estimate tire age: assume fresh tires at race start (lap 1 = tire age 1)
    # If we're on lap 20, tire age could be 20 if no pit stops, or less if pitted
    # For simplicity, estimate based on typical stint length
    typical_stint_length = 20  # Average stint length
    estimated_tire_age = min(current_lap % typical_stint_length, typical_stint_length)
    if estimated_tire_age == 0:
        estimated_tire_age = 1  # Fresh tires
    
    laps_left = max(0, total_laps - current_lap)
    
    return {
        "current_tire_age": estimated_tire_age,
        "compound_str": compound.upper(),
        "laps_left": laps_left,
        "current_lap": current_lap
    }


def get_tire_data(
    driver: str = DEFAULT_DRIVER,
    year: int = 2023,
    location: str = "Italy",
    session_type: str = "R",
    fallback_to_csv: bool = True,
    fallback_to_estimate: bool = True
) -> Dict[str, any]:
    """
    Main function to get tire data with multiple fallback strategies.
    
    Priority:
    1. Try fastf1 live/historical session
    2. Try CSV historical data
    3. Estimate from race state
    
    Args:
        driver: Driver abbreviation
        year: F1 season year
        location: Race location
        session_type: Session type (R=Race, Q=Qualifying, etc.)
        fallback_to_csv: Whether to fallback to CSV if session fails
        fallback_to_estimate: Whether to fallback to estimation if CSV fails
    
    Returns:
        Dict with current_tire_age, compound_str, laps_left, current_lap
    """
    # Strategy 1: Try fastf1 session
    f1_data = get_tire_data_from_f1_session(year, location, session_type, driver)
    if f1_data:
        print(f"✅ Using F1 session data: Lap {f1_data['current_lap']}, Tire Age {f1_data['current_tire_age']}, Compound {f1_data['compound_str']}, Laps Left {f1_data['laps_left']}")
        return f1_data
    
    # Strategy 2: Fallback to CSV
    if fallback_to_csv:
        csv_data = get_tire_data_from_csv(driver=driver)
        if csv_data:
            print(f"✅ Using CSV data: Lap {csv_data['current_lap']}, Tire Age {csv_data['current_tire_age']}, Compound {csv_data['compound_str']}, Laps Left {csv_data['laps_left']}")
            return csv_data
    
    # Strategy 3: Estimate from race state
    if fallback_to_estimate:
        estimated = estimate_tire_data_from_race_state(
            current_lap=20,  # Default to mid-race
            total_laps=DEFAULT_TOTAL_LAPS,
            compound="MEDIUM"
        )
        print(f"⚠️  Using estimated data: Lap {estimated['current_lap']}, Tire Age {estimated['current_tire_age']}, Compound {estimated['compound_str']}, Laps Left {estimated['laps_left']}")
        return estimated
    
    # Final fallback: return defaults
    return {
        "current_tire_age": 15,
        "compound_str": "MEDIUM",
        "laps_left": 30,
        "current_lap": 20
    }
