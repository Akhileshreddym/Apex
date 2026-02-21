import asyncio
import websockets
import json

EVENTS = [
    "minor_crash", "major_crash", "rain", 
    "heatwave", "traffic", "tyre_failure", 
    "penalty_5s", "tyre_deg"
]

async def test_backend():
    uri = "ws://127.0.0.1:8000/ws/chaos"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            
            for event in EVENTS:
                print(f"\n--- Sending '{event}' ---")
                payload = {
                    "event": event,
                    "current_tire_age": 12,
                    "compound": "MEDIUM",
                    "laps_left": 25
                }
                await websocket.send(json.dumps(payload))
                
                response = await websocket.recv()
                data = json.loads(response)
                print("Math Results:", data["math_results"])
                print("Radio Call:", data["radio_call"])
                
                # Small delay to not anger OpenRouter rate limits
                await asyncio.sleep(2)
                
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_backend())
