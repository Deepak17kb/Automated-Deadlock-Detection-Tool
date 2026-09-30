import { randomUUID } from 'node:crypto';

const MAX_ITEMS = 50;

export function normalizeModel(input) {
  if (!input || !Array.isArray(input.processes) || !Array.isArray(input.resources)
      || !Array.isArray(input.allocations) || !Array.isArray(input.requests)) {
    throw new Error('A scenario needs process, resource, allocation, and request arrays.');
  }
  if (!input.processes.length || !input.resources.length) {
    throw new Error('Add at least one process and one resource.');
  }
  if (input.processes.length > MAX_ITEMS || input.resources.length > MAX_ITEMS) {
    throw new Error(`Scenarios support up to ${MAX_ITEMS} processes and resources.`);
  }

  const cleanNames = values => values.map(value => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 32) {
      throw new Error('Names must contain 1 to 32 characters.');
    }
    return value.trim();
  });
  const processes = cleanNames(input.processes);
  const resources = cleanNames(input.resources);
  if (new Set([...processes, ...resources]).size !== processes.length + resources.length) {
    throw new Error('Process and resource names must be unique.');
  }

  const processSet = new Set(processes);
  const resourceSet = new Set(resources);
  const held = new Set();
  const allocations = input.allocations.map(item => {
    const process = item?.process ?? item?.p;
    const resource = item?.resource ?? item?.r;
    if (!processSet.has(process) || !resourceSet.has(resource)) {
      throw new Error('Allocations must reference configured processes and resources.');
    }
    if (held.has(resource)) throw new Error(`${resource} already has a holder; resources have one instance each.`);
    held.add(resource);
    return { process, resource };
  });
  const seenRequests = new Set();
  const requests = input.requests.map(item => {
    const process = item?.process ?? item?.p;
    const resource = item?.resource ?? item?.r;
    const key = JSON.stringify([process, resource]);
    if (!processSet.has(process) || !resourceSet.has(resource) || seenRequests.has(key)) {
      throw new Error('Requests must be unique and reference configured processes and resources.');
    }
    seenRequests.add(key);
    return { process, resource };
  });
  return { processes, resources, allocations, requests };
}

export function createSimulation(model, id = randomUUID(), scenarioName = 'Untitled scenario') {
  const normalized = normalizeModel(model);
  const processes = normalized.processes.map((process, index) => {
    const work = 2 + index % 2;
    return {
      id: process,
      status: 'ready',
      requests: normalized.requests.filter(item => item.process === process).map(item => item.resource),
      requestIndex: 0,
      workRemaining: work,
      workTotal: work,
      phase: 'CPU burst'
    };
  });
  const state = {
    id,
    scenarioName,
    model: normalized,
    status: 'ready',
    tick: 0,
    cursor: 0,
    processes,
    allocations: normalized.allocations.map(item => ({ ...item })),
    activeRequests: [],
    deadlocks: [],
    deadlockResolved: false,
    resolution: null,
    events: [],
    cpu: { coreCount: 1, currentProcess: null, dispatches: 0, busyTicks: 0 }
  };
  addEvent(state, 'SYSTEM', 'Virtual operating system initialized with one round-robin CPU core.');
  return state;
}

export function detectDeadlocks(processes, allocations, requests) {
  const graph = new Map(processes.map(process => [process.id || process, []]));
  requests.forEach(request => {
    const owner = allocations.find(item => item.resource === request.resource);
    if (owner && owner.process !== request.process) {
      graph.get(request.process)?.push({ from: request.process, to: owner.process, resource: request.resource });
    }
  });

  let nextIndex = 0;
  const indexByNode = new Map();
  const lowByNode = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];

  function visit(node) {
    indexByNode.set(node, nextIndex);
    lowByNode.set(node, nextIndex++);
    stack.push(node);
    onStack.add(node);
    const neighbors = [...new Set(graph.get(node).map(edge => edge.to))];
    neighbors.forEach(neighbor => {
      if (!indexByNode.has(neighbor)) {
        visit(neighbor);
        lowByNode.set(node, Math.min(lowByNode.get(node), lowByNode.get(neighbor)));
      } else if (onStack.has(neighbor)) {
        lowByNode.set(node, Math.min(lowByNode.get(node), indexByNode.get(neighbor)));
      }
    });
    if (lowByNode.get(node) === indexByNode.get(node)) {
      const component = [];
      let member;
      do {
        member = stack.pop();
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      components.push(component);
    }
  }

  graph.forEach((_, process) => { if (!indexByNode.has(process)) visit(process); });
  return components
    .filter(component => component.length > 1 || graph.get(component[0]).some(edge => edge.to === component[0]))
    .map(component => ({ processes: component, edges: findCycle(component, graph) }))
    .filter(cycle => cycle.edges.length);
}

function findCycle(component, graph) {
  const allowed = new Set(component);
  for (const start of component) {
    for (const first of graph.get(start)) {
      if (!allowed.has(first.to)) continue;
      if (first.to === start) return [first];
      const queue = [first.to];
      const parentEdges = new Map([[first.to, null]]);
      for (let index = 0; index < queue.length; index++) {
        const current = queue[index];
        for (const edge of graph.get(current)) {
          if (!allowed.has(edge.to)) continue;
          if (edge.to === start) {
            const tail = [edge];
            let cursor = current;
            while (cursor !== first.to) {
              const previous = parentEdges.get(cursor);
              tail.unshift(previous);
              cursor = previous.from;
            }
            return [first, ...tail];
          }
          if (!parentEdges.has(edge.to)) {
            parentEdges.set(edge.to, edge);
            queue.push(edge.to);
          }
        }
      }
    }
  }
  return [];
}

function addEvent(state, kind, message) {
  const event = { tick: state.tick, kind, message, createdAt: new Date().toISOString() };
  state.events.push(event);
  state.events = state.events.slice(-80);
  return event;
}

function grantWaitingProcesses(state, emittedEvents) {
  state.processes.filter(process => process.status === 'blocked').forEach(process => {
    const resource = process.requests[process.requestIndex];
    if (!resource) return;
    const owner = state.allocations.find(item => item.resource === resource);
    if (owner && owner.process !== process.id) return;
    if (!owner) state.allocations.push({ process: process.id, resource });
    state.activeRequests = state.activeRequests.filter(item => item.process !== process.id);
    process.requestIndex++;
    process.status = 'ready';
    process.phase = 'CPU burst';
    process.workRemaining = 1 + process.requestIndex % 2;
    process.workTotal = process.workRemaining;
    emittedEvents.push(addEvent(state, 'GRANT', `${process.id} acquired ${resource}.`));
  });
}

export function advanceSimulation(state) {
  if (['complete', 'deadlocked'].includes(state.status)) return { state, events: [] };
  const shouldContinue = ['running', 'waiting'].includes(state.status);
  const emittedEvents = [];
  state.tick++;
  state.cpu.currentProcess = null;
  grantWaitingProcesses(state, emittedEvents);

  let selectedIndex = -1;
  for (let offset = 0; offset < state.processes.length; offset++) {
    const index = (state.cursor + offset) % state.processes.length;
    if (state.processes[index].status === 'ready') {
      selectedIndex = index;
      break;
    }
  }

  if (selectedIndex >= 0) {
    const process = state.processes[selectedIndex];
    state.cursor = (selectedIndex + 1) % state.processes.length;
    process.status = 'running';
    process.workRemaining--;
    state.cpu.currentProcess = process.id;
    state.cpu.dispatches++;
    state.cpu.busyTicks++;
    emittedEvents.push(addEvent(state, 'CPU', `${process.id} executed a CPU time slice.`));

    if (process.workRemaining <= 0) {
      const requestedResource = process.requests[process.requestIndex];
      if (requestedResource) {
        process.status = 'blocked';
        process.phase = `Waiting for ${requestedResource}`;
        state.activeRequests.push({ process: process.id, resource: requestedResource });
        emittedEvents.push(addEvent(state, 'WAIT', `${process.id} requested ${requestedResource} and is waiting.`));
      } else {
        process.status = 'completed';
        process.phase = 'Finished';
        const released = state.allocations.filter(item => item.process === process.id).map(item => item.resource);
        state.allocations = state.allocations.filter(item => item.process !== process.id);
        emittedEvents.push(addEvent(state, 'EXIT', `${process.id} completed${released.length ? ` and released ${released.join(', ')}` : ''}.`));
      }
    } else {
      process.status = 'ready';
      process.phase = 'CPU burst';
    }
  }

  const deadlocks = detectDeadlocks(state.processes, state.allocations, state.activeRequests);
  if (deadlocks.length) {
    state.deadlocks = deadlocks;
    const deadlockedProcesses = new Set(deadlocks.flatMap(cycle => cycle.processes));
    state.processes.forEach(process => {
      if (deadlockedProcesses.has(process.id)) process.status = 'deadlocked';
    });
    state.status = 'deadlocked';
    emittedEvents.push(addEvent(state, 'DEADLOCK', `Deadlock detected across ${deadlocks.length} wait-for group${deadlocks.length === 1 ? '' : 's'}.`));
  } else if (state.processes.every(process => ['completed', 'terminated'].includes(process.status))) {
    state.status = 'complete';
    emittedEvents.push(addEvent(state, 'SYSTEM', 'All processes completed; every held resource was released.'));
  } else if (state.processes.every(process => ['blocked', 'deadlocked', 'completed', 'terminated'].includes(process.status))) {
    state.status = 'waiting';
    if (!state.events.some(event => event.kind === 'SCHEDULER' && event.tick === state.tick - 1)) {
      emittedEvents.push(addEvent(state, 'SCHEDULER', 'Waiting for the next resource grant check.'));
    }
  } else if (shouldContinue) {
    state.status = 'running';
  }

  return { state, events: emittedEvents };
}

export function resolveDeadlock(state, processId) {
  if (state.status !== 'deadlocked') throw new Error('This simulation is not currently deadlocked.');
  const deadlocked = new Set(state.deadlocks.flatMap(cycle => cycle.processes));
  if (!deadlocked.has(processId)) throw new Error('Choose a process that belongs to a deadlocked cycle.');
  const victim = state.processes.find(process => process.id === processId);
  const releasedResources = state.allocations.filter(item => item.process === processId).map(item => item.resource);
  state.allocations = state.allocations.filter(item => item.process !== processId);
  state.activeRequests = state.activeRequests.filter(item => item.process !== processId);
  victim.status = 'terminated';
  victim.phase = 'Terminated during recovery';
  state.processes.forEach(process => {
    if (process.status === 'deadlocked') process.status = 'blocked';
  });
  state.deadlocks = detectDeadlocks(state.processes, state.allocations, state.activeRequests);
  state.deadlockResolved = true;
  state.resolution = { process: processId, releasedResources, tick: state.tick };
  const events = [addEvent(state, 'RECOVERY', `Deadlock resolved by terminating ${processId}${releasedResources.length ? ` and releasing ${releasedResources.join(', ')}` : ''}.`)];
  if (state.deadlocks.length) {
    state.status = 'deadlocked';
    const stillBlocked = new Set(state.deadlocks.flatMap(cycle => cycle.processes));
    state.processes.forEach(process => {
      if (stillBlocked.has(process.id)) process.status = 'deadlocked';
    });
  } else {
    grantWaitingProcesses(state, events);
    state.status = state.processes.every(process => ['completed', 'terminated'].includes(process.status)) ? 'complete' : 'running';
  }
  return { state, events, releasedResources };
}
