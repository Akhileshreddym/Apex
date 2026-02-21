# Project Context: Apex
## Hacklytics 2026 - F1 Strategy & Chaos Simulator

### 1. Project Overview
We are building a real-time, interactive F1 strategy simulator with a dual-screen architecture. 
- **Screen 1 (Laptop - The Pit Wall):** A dense, dark-mode, Next.js dashboard showing real-time F1 car telemetry on an HTML5 `<canvas>` which will be on the middle top of the screen, driver picture at the left top of the screen which will be generated using a API later(nano banana pro), right below it a box for pit window data, below it a weather box with data about current and future weather, below it is live tire degradation charts, and then below the f1 car telemetry live car timings, right top will have strategy rec’s and  below that is an history bar of all data from the race.
- **Screen 2 (iPad - The Steward):** A tactile soundboard with massive buttons (Rain, Crash, Safety Car) that injects chaos into the simulation via WebSockets.
- **The Brain:** A Python FastAPI backend running a hybrid machine learning and vectorized Monte Carlo physics engine to recalculate race probabilities in milliseconds.
- **The Voice:** ElevenLabs Conversational AI (WebRTC) acting as a stressed F1 Race Engineer that interrupts the user with live strategy calls powered by the Gemini API.

### 2. Tech Stack & Responsibilities
- **Frontend (Next.js App Router):** Tailwind CSS, HTML5 `<canvas>` for high-FPS animation, `@elevenlabs/react` SDK for WebRTC audio, standard WebSockets for event listening.
- **Backend (Python FastAPI):** `fastf1` for historical data (cached locally), `xgboost` for baseline lap time prediction, `numpy` for vectorized Monte Carlo simulations, `google-generativeai` for LLM prompt orchestration.

### 3. The "Golden Loop" (Event Flow)
Whenever generating code, ensure it adheres to this exact data pipeline:
1. The Next.js frontend is looping historical `telemetry.csv` data to animate cars on the Canvas.
2. User taps "Sudden Rain" on the Next.js `/ipad` route.
3. Frontend emits WebSocket payload: `{"event": "rain", "intensity": "heavy"}` to FastAPI.
4. FastAPI intercepts. It asks the pre-trained `XGBoost` model for the baseline lap times of all 20 cars based on their current tire age.
5. FastAPI passes the baseline to a `NumPy` Monte Carlo simulator. It applies a +15 second penalty to dry tires, adds Gaussian noise, and simulates the remaining 30 laps 10,000 times.
6. The math engine outputs the highest probability winning strategy: `{"action": "box", "compound": "intermediates", "win_prob": 82}`.
7. FastAPI injects this JSON into a strict Gemini API prompt. Gemini formats it into a 3-sentence radio call.
8. FastAPI sends the text string back to the Next.js frontend via WebSocket.
9. Next.js triggers the ElevenLabs `useConversation` hook to speak the text out loud while playing a thunder SFX.

### 4. Strict Coding Directives (DO NOT DEVIATE)
- **Zero React State for Animation:** Do NOT use `useState` or `useEffect` to update the X/Y coordinates of 20 cars. It will lag. Use a `ref` and raw HTML5 `<canvas>` API for rendering the track map.
- **Zero For-Loops in the Math:** The Monte Carlo simulation MUST be written using NumPy vectorization (`np.random.normal`, `np.sum`, `np.argmin`). It must calculate 10,000 simulations in under 0.2 seconds.
- **Cached Data Only:** Do NOT make live HTTP requests to the FastF1 API during the simulation loop. All FastF1 data (`laps_data.csv` and `telemetry.csv`) must be loaded into pandas DataFrames in memory on server startup.
- **No LLM Hallucinations:** The LLM (Gemini) does ZERO math. It acts strictly as a text formatter. The Python backend passes it the exact numbers and instructions.
- **UI Design System:** "Tarmac Industrial." Dark backgrounds (`bg-gray-950`), monospace fonts for all numbers (`font-mono`), sharp edges (no `rounded-full` except for the cars), and high-contrast neon accents (Cyan, Warning Orange, Alert Red).

### 5. AI Assistant Instructions
When asked to write code for this project:
- Provide complete, copy-pasteable code blocks. Do not use placeholders like `// ... rest of your code here`.
- Assume the developer is moving extremely fast. Prioritize robust error handling (especially for WebSockets and API timeouts) so the app does not crash during a live demo.
- If an architecture decision will cause latency > 1.0 second, warn the developer immediately and propose a faster alternative.