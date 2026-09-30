# Deadlock Runtime Lab

A full-stack operating-systems simulator. A Node.js backend advances a virtual CPU and resource scheduler, broadcasts live state over Socket.IO, and stores scenarios, run snapshots, execution events, and recovery actions in SQLite. The React dashboard lets you inspect a deadlock and choose how to resolve it.

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

## Deploy On Render

The `render.yaml` Blueprint deploys the frontend and Node API as one service. It also mounts a persistent disk at `data/`, where SQLite stores scenarios and run history. Since SQLite must survive deploys and restarts, this configuration uses Render's paid `0.5c-512mb` compute plan and a 1 GB persistent disk.

1. Sign in to Render and choose **New > Blueprint**.
2. Connect `Deepak17kb/Automated-Deadlock-Detection-Tool` and select `main`.
3. Review `render.yaml`; confirm the service and persistent disk pricing before creating resources.
4. Render builds the Vite frontend, starts Express, checks `/api/health`, and deploys future pushes to `main` automatically.

Render assigns the public `onrender.com` URL after provisioning. The repository's `CNAME` file does not configure Render DNS. To use `deadlock-detection.com`, add it as a custom domain in the Render service and update DNS using the records Render provides.

Vercel is not required for this setup. It can host a static frontend, but this app's live Socket.IO backend and SQLite database still need a persistent Node host.

The API currently has no user authentication. Do not expose sensitive data through the public deployment; add an access gate before using it for private scenarios.

## Simulation

1. Pick a starter scenario or define processes, resources, allocations, and requests.
2. Start the run. The backend schedules CPU bursts in round-robin order and advances one virtual second per tick.
3. Watch process states, resource owners, wait queues, the resource-allocation graph, and the persisted event trace update live.
4. If the backend detects a wait-for cycle, the run pauses and offers **Resolve deadlock**.
5. Choose a process in the cycle and confirm. The backend terminates it, releases its resources, records the recovery action, and resumes the remaining processes.

The controls support pause, resume, single-step, reset, and live speed changes. Completed runs and previous runs remain available in the run history.

## Model Boundaries

- The scheduler currently simulates one virtual CPU core.
- Each resource has one exclusive instance and at most one holder.
- A process runs a deterministic CPU burst, issues its configured requests in order, and releases held resources when it exits.
- Deadlock detection uses strongly connected components in the wait-for graph.
- Recovery is an explicit process termination action; this is not Banker's Algorithm and does not model arbitrary OS-level resource policies.
- There is no user authentication. Run this as a local development tool; add authentication and access control before exposing the API to a network.

## Storage

SQLite is created automatically at `data/deadlock-lab.sqlite`. The database stores:

- `scenarios`: named configurations and their resource/process model.
- `simulation_runs`: current run state, status, scenario name, and tick snapshot.
- `simulation_events`: durable CPU, request, grant, completion, deadlock, and recovery events.
- `resolutions`: selected victim process and resources released during recovery.

The `data/` directory is ignored by Git. Back it up to preserve local scenarios and run history.

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
