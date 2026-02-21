from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import asyncio
import json
import os
import google.generativeai as genai
from simulator import run_monte_carlo

app = FastAPI()

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY", "")
if api_key:
    genai.configure(api_key=api_key)
    
# Use gemini-2.5-flash which is standard and fast
model = genai.GenerativeModel('gemini-2.5-flash')

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
        return "Gemini API key not found. Simulated Radio: Box box box!"
        
    prompt = f"""
    You are a highly stressed F1 Race Engineer. 
    A sudden '{event}' event has occurred.
    
    Here is the output from our strategy Monte Carlo simulator:
    {json.dumps(math_results, indent=2)}

    Based ONLY on this info, generate exactly a 3-sentence radio call to the driver.
    Keep it panicked but professional. Include the specific recommendation and win probability.
    """
    
    try:
        # 1.0s latency budget: we use a timeout
        response = await asyncio.wait_for(
            asyncio.to_thread(model.generate_content, prompt), 
            timeout=1.5
        )
        return response.text.strip()
    except asyncio.TimeoutError:
        print("Gemini API timeout.")
        return "Copy that, we are crunching the numbers. Stay out for now."
    except Exception as e:
        print(f"Gemini API error: {e}")
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
            
            # Default variables for the demo if not provided
            current_tire_age = payload.get("current_tire_age", 15)
            compound_str = payload.get("compound", "MEDIUM")
            laps_left = payload.get("laps_left", 30)
            
            is_rain = (event == "rain")

            # 1. Run Vectorized Monte Carlo Physics Engine
            try:
                # Simulates 10k races in pure NumPy
                math_out = run_monte_carlo(
                    current_tire_age=current_tire_age,
                    compound_str=compound_str, 
                    laps_left=laps_left,
                    is_rain=is_rain
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
