import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceSimulation, createSimulation, normalizeModel, resolveDeadlock } from './simulator.js';
import { presets } from './presets.js';

function stepUntilTerminal(state, limit = 30) {
  for (let index = 0; index < limit && !['complete', 'deadlocked'].includes(state.status); index++) {
    state = advanceSimulation(state).state;
  }
  return state;
}

test('classic preset reaches a resource-aware deadlock', () => {
  const state = stepUntilTerminal(createSimulation(presets.classic.model));
  assert.equal(state.status, 'deadlocked');
  assert.equal(state.deadlocks.length, 1);
  assert.equal(state.deadlocks[0].edges.length, 2);
});

test('safe preset completes and releases all resources', () => {
  const state = stepUntilTerminal(createSimulation(presets.safe.model));
  assert.equal(state.status, 'complete');
  assert.ok(state.processes.every(process => process.status === 'completed'));
  assert.equal(state.allocations.length, 0);
});

test('terminating a selected deadlocked process releases resources and resumes', () => {
  let state = stepUntilTerminal(createSimulation(presets.classic.model));
  const victim = state.deadlocks[0].processes[0];
  state = resolveDeadlock(state, victim).state;
  assert.notEqual(state.status, 'deadlocked');
  assert.equal(state.processes.find(process => process.id === victim).status, 'terminated');
  state = stepUntilTerminal(state);
  assert.equal(state.status, 'complete');
});

test('model validation rejects multiple holders for a single-instance resource', () => {
  assert.throws(() => normalizeModel({
    processes: ['P1', 'P2'],
    resources: ['R1'],
    allocations: [{ process: 'P1', resource: 'R1' }, { process: 'P2', resource: 'R1' }],
    requests: []
  }), /one instance each/);
});
