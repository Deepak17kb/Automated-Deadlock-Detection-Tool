import express from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { database, insertEvent } from './database.js';
import { presets } from './presets.js';
import { advanceSimulation, createSimulation, normalizeModel, resolveDeadlock } from './simulator.js';

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(serverDirectory, '..');
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const port = Number(process.env.PORT || 3001);
const tickMilliseconds = Math.max(150, Number(process.env.SIM_TICK_MS || 900));
const liveStates = new Map();
const timers = new Map();
const runSpeeds = new Map();

app.use(express.json({ limit: '256kb' }));

function persistState(id, state, events = []) {
  const update = database.prepare(`
    UPDATE simulation_runs
    SET status = ?, tick = ?, state_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  const save = database.transaction(() => {
    update.run(state.status, state.tick, JSON.stringify(state), id);
    events.forEach(event => insertEvent.run(id, event.tick, event.kind, event.message));
  });
  save();
  liveStates.set(id, state);
}

function loadState(id) {
  const cached = liveStates.get(id);
  if (cached) return cached;
  const row = database.prepare('SELECT status, state_json FROM simulation_runs WHERE id = ?').get(id);
  if (!row) return null;
  const state = JSON.parse(row.state_json);
  if (row.status === 'running' || row.status === 'waiting') {
    state.status = 'paused';
    persistState(id, state);
  }
  liveStates.set(id, state);
  return state;
}

function publish(state) {
  io.to(`simulation:${state.id}`).emit('simulation:update', state);
}

function stopTimer(id) {
  const timer = timers.get(id);
  if (timer) clearInterval(timer);
  timers.delete(id);
}

function runTick(id) {
  const state = loadState(id);
  if (!state || !['running', 'waiting'].includes(state.status)) {
    stopTimer(id);
    return;
  }
  const result = advanceSimulation(state);
  persistState(id, result.state, result.events);
  publish(result.state);
  if (['complete', 'deadlocked'].includes(result.state.status)) stopTimer(id);
}

function startTimer(id, interval = runSpeeds.get(id) || tickMilliseconds) {
  stopTimer(id);
  runSpeeds.set(id, interval);
  timers.set(id, setInterval(() => runTick(id), interval));
}

function sendError(response, error, status = 400) {
  response.status(status).json({ error: error.message || 'Request failed.' });
}

function handle(callback) {
  return (request, response) => {
    try {
      callback(request, response);
    } catch (error) {
      const status = error.status || 400;
      sendError(response, error, status);
    }
  };
}

app.get('/api/health', handle((request, response) => {
  database.prepare('SELECT 1 AS ready').get();
  response.json({ status: 'ok', service: 'deadlock-runtime-api', storage: 'sqlite' });
}));

app.get('/api/presets', (request, response) => {
  response.json(Object.entries(presets).map(([id, preset]) => ({ id, name: preset.name, model: preset.model })));
});

app.get('/api/scenarios', (request, response) => {
  const rows = database.prepare('SELECT id, name, created_at AS createdAt, updated_at AS updatedAt FROM scenarios ORDER BY updated_at DESC').all();
  response.json(rows);
});

app.post('/api/scenarios', handle((request, response) => {
  const name = String(request.body?.name || '').trim().slice(0, 80);
  if (!name) throw new Error('Enter a name for this scenario.');
  const model = normalizeModel(request.body?.model);
  const id = randomUUID();
  database.prepare('INSERT INTO scenarios (id, name, model_json) VALUES (?, ?, ?)').run(id, name, JSON.stringify(model));
  response.status(201).json({ id, name, model });
}));

app.get('/api/scenarios/:id', handle((request, response) => {
  const row = database.prepare('SELECT id, name, model_json, created_at AS createdAt, updated_at AS updatedAt FROM scenarios WHERE id = ?').get(request.params.id);
  if (!row) {
    const error = new Error('Scenario not found.');
    error.status = 404;
    throw error;
  }
  response.json({ id: row.id, name: row.name, model: JSON.parse(row.model_json), createdAt: row.createdAt, updatedAt: row.updatedAt });
}));

app.delete('/api/scenarios/:id', handle((request, response) => {
  const result = database.prepare('DELETE FROM scenarios WHERE id = ?').run(request.params.id);
  if (!result.changes) {
    const error = new Error('Scenario not found.');
    error.status = 404;
    throw error;
  }
  response.status(204).end();
}));

app.get('/api/simulations', (request, response) => {
  const rows = database.prepare(`
    SELECT id, scenario_id AS scenarioId, scenario_name AS scenarioName, status, tick,
      created_at AS createdAt, updated_at AS updatedAt
    FROM simulation_runs ORDER BY updated_at DESC LIMIT 30
  `).all();
  response.json(rows);
});

app.post('/api/simulations', handle((request, response) => {
  let model = request.body?.model;
  let scenarioId = request.body?.scenarioId || null;
  let scenarioName = String(request.body?.scenarioName || 'Live simulation').trim().slice(0, 80) || 'Live simulation';
  if (scenarioId) {
    const scenario = database.prepare('SELECT name, model_json FROM scenarios WHERE id = ?').get(scenarioId);
    if (!scenario) throw new Error('Selected scenario was not found.');
    scenarioName = scenario.name;
    model = JSON.parse(scenario.model_json);
  }
  const normalized = normalizeModel(model);
  const id = randomUUID();
  const state = createSimulation(normalized, id, scenarioName);
  database.prepare(`
    INSERT INTO simulation_runs (id, scenario_id, scenario_name, status, tick, state_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, scenarioId, scenarioName, state.status, state.tick, JSON.stringify(state));
  insertEvent.run(id, state.events[0].tick, state.events[0].kind, state.events[0].message);
  liveStates.set(id, state);
  response.status(201).json({ state });
}));

app.get('/api/simulations/:id', handle((request, response) => {
  const state = loadState(request.params.id);
  if (!state) {
    const error = new Error('Simulation run not found.');
    error.status = 404;
    throw error;
  }
  response.json({ state });
}));

app.get('/api/simulations/:id/events', handle((request, response) => {
  if (!database.prepare('SELECT id FROM simulation_runs WHERE id = ?').get(request.params.id)) {
    const error = new Error('Simulation run not found.');
    error.status = 404;
    throw error;
  }
  const limit = Math.min(500, Math.max(1, Number(request.query.limit) || 100));
  const rows = database.prepare(`
    SELECT id, tick, kind, message, created_at AS createdAt
    FROM simulation_events WHERE run_id = ? ORDER BY id DESC LIMIT ?
  `).all(request.params.id, limit);
  response.json(rows);
}));

app.post('/api/simulations/:id/start', handle((request, response) => {
  const state = loadState(request.params.id);
  if (!state) throw Object.assign(new Error('Simulation run not found.'), { status: 404 });
  if (state.status === 'deadlocked') throw Object.assign(new Error('Resolve the deadlock before resuming.'), { status: 409 });
  if (state.status === 'complete') throw Object.assign(new Error('This simulation is complete. Reset it to run again.'), { status: 409 });
  state.status = 'running';
  persistState(state.id, state);
  const interval = Number(request.body?.tickMs);
  startTimer(state.id, Number.isFinite(interval) ? Math.min(5000, Math.max(150, interval)) : tickMilliseconds);
  publish(state);
  response.json({ state });
}));

app.post('/api/simulations/:id/pause', handle((request, response) => {
  const state = loadState(request.params.id);
  if (!state) throw Object.assign(new Error('Simulation run not found.'), { status: 404 });
  stopTimer(state.id);
  if (!['deadlocked', 'complete'].includes(state.status)) state.status = 'paused';
  persistState(state.id, state);
  publish(state);
  response.json({ state });
}));

app.post('/api/simulations/:id/speed', handle((request, response) => {
  const state = loadState(request.params.id);
  if (!state) throw Object.assign(new Error('Simulation run not found.'), { status: 404 });
  const interval = Number(request.body?.tickMs);
  if (!Number.isFinite(interval)) throw new Error('Choose a valid simulation speed.');
  const boundedInterval = Math.min(5000, Math.max(150, interval));
  runSpeeds.set(state.id, boundedInterval);
  if (timers.has(state.id)) startTimer(state.id, boundedInterval);
  response.json({ state, tickMs: boundedInterval });
}));

app.post('/api/simulations/:id/step', handle((request, response) => {
  const state = loadState(request.params.id);
  if (!state) throw Object.assign(new Error('Simulation run not found.'), { status: 404 });
  if (['deadlocked', 'complete'].includes(state.status)) throw Object.assign(new Error('Reset or resolve this run before stepping.'), { status: 409 });
  stopTimer(state.id);
  state.status = 'paused';
  const result = advanceSimulation(state);
  persistState(state.id, result.state, result.events);
  publish(result.state);
  response.json({ state: result.state });
}));

app.post('/api/simulations/:id/reset', handle((request, response) => {
  const previous = loadState(request.params.id);
  if (!previous) throw Object.assign(new Error('Simulation run not found.'), { status: 404 });
  stopTimer(previous.id);
  const state = createSimulation(previous.model, previous.id, previous.scenarioName);
  persistState(state.id, state, state.events);
  publish(state);
  response.json({ state });
}));

app.post('/api/simulations/:id/resolve', handle((request, response) => {
  const state = loadState(request.params.id);
  if (!state) throw Object.assign(new Error('Simulation run not found.'), { status: 404 });
  const { state: resolved, events, releasedResources } = resolveDeadlock(state, request.body?.processId);
  const saveResolution = database.prepare(`
    INSERT INTO resolutions (run_id, process_id, released_resources_json, tick)
    VALUES (?, ?, ?, ?)
  `);
  saveResolution.run(resolved.id, request.body.processId, JSON.stringify(releasedResources), resolved.tick);
  persistState(resolved.id, resolved, events);
  if (resolved.status === 'running') startTimer(resolved.id);
  publish(resolved);
  response.json({ state: resolved });
}));

io.on('connection', socket => {
  socket.on('simulation:join', runId => {
    if (typeof runId !== 'string') return;
    const state = loadState(runId);
    if (!state) return;
    socket.join(`simulation:${runId}`);
    socket.emit('simulation:update', state);
  });
});

const distribution = resolve(projectDirectory, 'dist');
if (existsSync(distribution)) {
  app.use(express.static(distribution));
  app.get(/^(?!\/api(?:\/|$)|\/socket\.io(?:\/|$)).*/, (request, response) => {
    response.sendFile(resolve(distribution, 'index.html'));
  });
}

app.use((request, response) => response.status(404).json({ error: 'Route not found.' }));
app.use((error, request, response, next) => {
  console.error(error);
  if (response.headersSent) return next(error);
  response.status(500).json({ error: 'Unexpected server error.' });
});

httpServer.listen(port, process.env.HOST || '127.0.0.1', () => {
  console.log(`Deadlock Runtime API listening on http://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    timers.forEach(timer => clearInterval(timer));
    database.close();
    httpServer.close(() => process.exit(0));
  });
}
