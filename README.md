# Deadlock Runtime Lab

Deadlock Runtime Lab is an interactive operating-systems simulator for building resource-allocation scenarios, running a virtual CPU scheduler, and observing deadlock detection and recovery. It simulates processes only; it never inspects or controls real operating-system processes.

## Quick Start

Recommended: Node.js 24.14.0 (the repository-pinned version in `.node-version`). Vite 7 requires Node.js 20.19+ or 22.12+.

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`. The development API runs on `http://localhost:3001`.

1. Choose a starter system, or add processes and resources in **Set up a system**.
2. Add held-resource links and waiting requests. Resource-to-process links mean a resource is held; process-to-resource links mean a process is waiting.
3. Select **Start**. Use pause, single-step, speed, and reset controls to inspect scheduler behavior.
4. Follow process states, resource queues, the event trace, and the live graph. Select a graph node to highlight its connections; zoom controls change the graph scale.
5. When a wait-for cycle is found, choose a process to terminate and release its resources, then inspect the resumed run.

## Run Modes and Data

The app checks for the local API at startup. When it is available, Express, Socket.IO, and SQLite provide simulation updates and durable scenario/run history. SQLite is created at `data/deadlock-lab.sqlite`; set `PORT`, `HOST`, or `SIM_TICK_MS` to configure the server. The API binds to `127.0.0.1` by default.

If the API is unavailable, the simulator falls back to browser mode. Scenarios, drafts, and recent runs are saved in that browser profile's local storage; they do not sync between browsers or devices and are not a backup.

## Model and Detection

- The scheduler uses one virtual CPU core and advances in virtual ticks.
- Each resource has one exclusive instance and at most one holder.
- Processes run deterministic CPU bursts, issue configured requests in order, and release held resources when they exit.
- The graph shows allocation edges from resource to process and request edges from process to resource. A wait-for cycle is highlighted as a deadlock.
- Detection uses strongly connected components in the wait-for graph. Recovery explicitly terminates a selected process and releases its resources; the simulator does not implement Banker's Algorithm or general operating-system policies.

## Deployment

GitHub Pages builds a static browser-mode app through the GitHub Actions workflow. In GitHub, set **Settings > Pages > Build and deployment** to **GitHub Actions**, then push to `main` or run **Deploy GitHub Pages** from the Actions tab. The site has no Express API, Socket.IO service, or shared SQLite database. Browser data remains local to each user. Vercel can also host the static frontend using `vercel.json`; shared storage requires a separately hosted API and database.

The API has no user authentication. Do not expose sensitive scenarios through a public deployment without adding an access gate.

## Development

```powershell
npm test
npm run build
npm start
```

`npm start` serves the production frontend and API on port `3001` after a build.

## Project Layout

```text
index.html          Vite frontend entry
src/                React dashboard, API client, browser storage, and styles
server/index.js     Express REST API and Socket.IO server
server/simulator.js Scheduler, model validation, and deadlock detection
server/database.js  SQLite schema and persistence
server/presets.js   Starter systems
```
