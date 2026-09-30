import { normalizeModel } from '../server/simulator.js';

const STORAGE_KEY = 'deadlock-runtime-lab:v1';
const MAX_RUNS = 12;

function emptyWorkspace() {
  return { draft: null, scenarios: [], runs: [], currentRunId: null };
}

function normalizeDraft(value) {
  if (!value || !Array.isArray(value.processes) || !Array.isArray(value.resources)
      || !Array.isArray(value.allocations) || !Array.isArray(value.requests)) {
    throw new Error('Invalid saved draft.');
  }
  if (value.processes.length && value.resources.length) return normalizeModel(value);
  if (value.allocations.length || value.requests.length) throw new Error('Incomplete drafts cannot contain relationships.');
  return {
    processes: value.processes,
    resources: value.resources,
    allocations: [],
    requests: []
  };
}

function readWorkspace() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!value || typeof value !== 'object') return emptyWorkspace();
    return {
      draft: value.draft ? normalizeDraft(value.draft) : null,
      scenarios: Array.isArray(value.scenarios) ? value.scenarios.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string').map(item => ({ ...item, model: normalizeModel(item.model) })) : [],
      runs: Array.isArray(value.runs) ? value.runs.filter(item => item && typeof item.id === 'string' && item.model).slice(0, MAX_RUNS) : [],
      currentRunId: typeof value.currentRunId === 'string' ? value.currentRunId : null
    };
  } catch {
    return emptyWorkspace();
  }
}

function writeWorkspace(workspace) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...workspace,
    runs: workspace.runs.slice(0, MAX_RUNS)
  }));
}

export function loadBrowserWorkspace() {
  const workspace = readWorkspace();
  let currentRun = workspace.runs.find(run => run.id === workspace.currentRunId) || null;
  if (currentRun && ['running', 'waiting'].includes(currentRun.status)) {
    currentRun = { ...currentRun, status: 'paused' };
    workspace.runs = [currentRun, ...workspace.runs.filter(run => run.id !== currentRun.id)];
    writeWorkspace(workspace);
  }
  return { ...workspace, currentRun };
}

export function saveBrowserDraft(model) {
  const workspace = readWorkspace();
  workspace.draft = normalizeDraft(model);
  writeWorkspace(workspace);
}

export function saveBrowserScenario(name, model) {
  const workspace = readWorkspace();
  const scenario = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    name: name.trim().slice(0, 80),
    model: normalizeModel(model),
    createdAt: new Date().toISOString()
  };
  workspace.scenarios = [scenario, ...workspace.scenarios];
  writeWorkspace(workspace);
  return scenario;
}

export function deleteBrowserScenario(id) {
  const workspace = readWorkspace();
  workspace.scenarios = workspace.scenarios.filter(scenario => scenario.id !== id);
  writeWorkspace(workspace);
}

export function saveBrowserRun(run) {
  const workspace = readWorkspace();
  const snapshot = JSON.parse(JSON.stringify(run));
  workspace.runs = [snapshot, ...workspace.runs.filter(item => item.id !== snapshot.id)].slice(0, MAX_RUNS);
  workspace.currentRunId = snapshot.id;
  writeWorkspace(workspace);
  return snapshot;
}

export function loadBrowserRun(id) {
  return readWorkspace().runs.find(run => run.id === id) || null;
}

export function listBrowserScenarios() {
  return readWorkspace().scenarios;
}

export function listBrowserRuns() {
  return readWorkspace().runs.map(run => ({
    id: run.id,
    scenarioName: run.scenarioName,
    status: run.status,
    tick: run.tick,
    updatedAt: run.events?.at(-1)?.createdAt || new Date().toISOString()
  }));
}
