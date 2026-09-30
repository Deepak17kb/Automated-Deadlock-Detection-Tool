# Deadlock Runtime Lab

A browser-based operating-systems simulator. It uses the same virtual CPU, resource scheduler, and deadlock recovery logic in either browser-only mode or with the optional Node.js API.

> This project simulates processes. It does not inspect, pause, or terminate real operating-system processes.

## Start Locally

Requirements: Node.js 20.19+ or 22.12+.

```powershell
npm install
npm run dev
```

Open the Vite URL printed in the terminal, normally `http://localhost:5173`. The API runs on `http://localhost:3001`.

For a production build:

```powershell
npm run build
npm start
```

The Express server serves the production frontend and API on port `3001`. Set `PORT`, `HOST`, or `SIM_TICK_MS` to configure the server. The local API binds to `127.0.0.1` by default.

## Free GitHub Pages Deployment

The GitHub Actions workflow in `.github/workflows/deploy-pages.yml` builds and deploys the frontend automatically on pushes to `main`. The static site runs the full simulator in the browser; scenarios, current drafts, and recent run history save to that browser's local storage.

1. In GitHub, open **Settings > Pages** and select **GitHub Actions** as the build and deployment source.
2. Push to `main`, or run **Deploy GitHub Pages** from the **Actions** tab.
3. The workflow URL appears after the deployment completes. For this repository it is normally `https://deepak17kb.github.io/Automated-Deadlock-Detection-Tool/`.

GitHub Pages is static hosting: this free deployment does not run Express, Socket.IO, or SQLite. Browser-mode saves are private to that browser profile and do not sync between devices.

Vercel can also host the static frontend using `vercel.json`. Persistent shared storage and multi-device accounts require a separately hosted API/database.

The API currently has no user authentication. Do not expose sensitive data through the public deployment; add an access gate before using it for private scenarios.

## Simulation

1. Pick a starter scenario or define processes, resources, allocations, and requests.
2. Start the run. The simulator schedules CPU bursts in round-robin order and advances one virtual second per tick.
3. Watch process states, resource owners, wait queues, the resource-allocation graph, and the event trace update live.
4. If a wait-for cycle is detected, the run pauses and offers **Resolve deadlock**.
5. Choose a process in the cycle and confirm. The simulator terminates it, releases its resources, records the recovery action, and resumes the remaining processes.

The controls support pause, resume, single-step, reset, and live speed changes. Completed runs and previous runs remain available in the run history.

## Model Boundaries

- The scheduler currently simulates one virtual CPU core.
- Each resource has one exclusive instance and at most one holder.
- A process runs a deterministic CPU burst, issues its configured requests in order, and releases held resources when it exits.
- Deadlock detection uses strongly connected components in the wait-for graph.
- Recovery is an explicit process termination action; this is not Banker's Algorithm and does not model arbitrary OS-level resource policies.
- Static deployments have no account system; local data remains in the current browser. Do not treat local storage as a backup or shared database.

## Storage

When the optional Node API is used locally, SQLite is created at `data/deadlock-lab.sqlite` and stores:

- `scenarios`: named configurations and their resource/process model.
- `simulation_runs`: current run state, status, scenario name, and tick snapshot.
- `simulation_events`: durable CPU, request, grant, completion, deadlock, and recovery events.
- `resolutions`: selected victim process and resources released during recovery.

On GitHub Pages or Vercel static hosting, the same features use browser local storage instead. Those saves do not sync to other devices. The `data/` directory is ignored by Git.

## Project Structure

```text
index.html          Vite frontend entry
src/                React dashboard, API client, and styles
server/index.js     Express REST API and Socket.IO server
server/simulator.js Backend scheduler, model validation, and deadlock detection
server/database.js  SQLite schema and persistence
server/presets.js   Starter systems
```

## Verification

```powershell
npm test
npm run build
```
