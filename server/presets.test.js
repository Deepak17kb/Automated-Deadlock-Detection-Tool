import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, detectDeadlocks } from './simulator.js';
import { presets } from './presets.js';

test('preset models can initialize with stable names', () => {
  for (const preset of Object.values(presets)) {
    const simulation = createSimulation(preset.model);
    assert.equal(simulation.status, 'ready');
    assert.equal(simulation.processes.length, preset.model.processes.length);
  }
});

test('a wait-for cycle includes its requested resources', () => {
  const model = presets.classic.model;
  const cycles = detectDeadlocks(model.processes, model.allocations, model.requests);
  assert.equal(cycles.length, 1);
  assert.deepEqual(new Set(cycles[0].edges.map(edge => edge.resource)), new Set(['R1', 'R2']));
});
