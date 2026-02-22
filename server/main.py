from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import asyncio
import json
import os
import requests
from dotenv import load_dotenv
from simulator import run_monte_carlo

load_dotenv()

app = FastAPI()

# Configure OpenRouter API Key (fallback to GEMINI_API_KEY)
api_key = os.environ.get("OPENROUTER_API_KEY", os.environ.get("GEMINI_API_KEY", ""))

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to client: {e}")

manager = ConnectionManager()


async def generate_radio_call(math_results: dict, event: str) -> str:
    if not api_key:
        return "OpenRouter API key not found. Simulated Radio: Box box box!"
        
    if event == "strategy_update":
        prompt = f"""
        You are a calm, highly analytical F1 Race Engineer.
        We are doing a routine strategy check.
        
        Here is the output from our strategy Monte Carlo simulator:
        {json.dumps(math_results, indent=2)}

        Based ONLY on this info, generate exactly a 1-to-2 sentence radio call to the driver.
        Keep it professional, concise, and focused on tire strategy or pace. 
        Include the specific recommendation and win probability.
        """
    else:
        prompt = f"""
        You are a highly stressed F1 Race Engineer. 
        A sudden '{event}' event has occurred.
        
        Here is the output from our strategy Monte Carlo simulator:
        {json.dumps(math_results, indent=2)}

        Based ONLY on this info, generate exactly a 3-sentence radio call to the driver.
        Keep it panicked but professional. Include the specific recommendation and win probability.
        """
    
    def fetch_openrouter():
        res = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "google/gemini-2.5-flash",
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=2.0
        )
        res.raise_for_status()
        return res.json()

    try:
        # Give a 2.0s latency budget for OpenRouter overhead via timeout parameter
        response_data = await asyncio.to_thread(fetch_openrouter)
        return response_data['choices'][0]['message']['content'].strip()
    except Exception as e:
        print(f"OpenRouter API error/timeout: {e}")
        return "Box box box! We have a strategy error, come in now!"


@app.websocket("/ws/chaos")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We expect standard JSON like {"event": "rain", "intensity": "heavy"}
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                payload = {"event": str(data)}

            event = payload.get("event", "").lower()
            print(f"Received chaos event: {event}")

            current_tire_age = int(payload.get("current_tire_age", 15))
            compound_str = str(payload.get("compound", "MEDIUM"))
            laps_left = int(payload.get("laps_left", 30))
            position = int(payload.get("position", 10))
            stint = int(payload.get("stint", 1))
            fresh_tyre = bool(payload.get("fresh_tyre", False))

            air_temp = float(payload.get("air_temp", 25.0))
            track_temp = float(payload.get("track_temp", 35.0))
            humidity = float(payload.get("humidity", 50.0))
            rainfall = int(payload.get("rainfall", 0))

            print(f"  tire_age={current_tire_age}  compound={compound_str}  "
                  f"laps_left={laps_left}  pos={position}")

            try:
                math_out = run_monte_carlo(
                    current_tire_age=current_tire_age,
                    compound_str=compound_str,
                    laps_left=laps_left,
                    air_temp=air_temp,
                    track_temp=track_temp,
                    humidity=humidity,
                    rainfall=rainfall,
                    event=event,
                    position=position,
                    stint=stint,
                    fresh_tyre=fresh_tyre
                )
            except Exception as e:
                print(f"Simulator error: {e}")
                math_out = {"error": "Math engine failure"}

            # 2. Generate LLM Script
            radio_script = await generate_radio_call(math_out, event)
            
            # 3. Broadcast Result
            final_response = {
                "event": event,
                "math_results": math_out,
                "radio_call": radio_script
            }
            
            await manager.broadcast(final_response)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Client disconnected from /ws/chaos")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
