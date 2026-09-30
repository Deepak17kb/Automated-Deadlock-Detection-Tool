export const presets = {
  classic: {
    name: 'Classic deadlock',
    model: {
      processes: ['P1', 'P2'],
      resources: ['R1', 'R2'],
      allocations: [{ resource: 'R1', process: 'P1' }, { resource: 'R2', process: 'P2' }],
      requests: [{ process: 'P1', resource: 'R2' }, { process: 'P2', resource: 'R1' }]
    }
  },
  dining: {
    name: 'Dining philosophers',
    model: {
      processes: ['P1', 'P2', 'P3'],
      resources: ['Fork1', 'Fork2', 'Fork3'],
      allocations: [{ resource: 'Fork1', process: 'P1' }, { resource: 'Fork2', process: 'P2' }, { resource: 'Fork3', process: 'P3' }],
      requests: [{ process: 'P1', resource: 'Fork2' }, { process: 'P2', resource: 'Fork3' }, { process: 'P3', resource: 'Fork1' }]
    }
  },
  safe: {
    name: 'Safe completion',
    model: {
      processes: ['P1', 'P2', 'P3'],
      resources: ['R1', 'R2'],
      allocations: [{ resource: 'R1', process: 'P1' }, { resource: 'R2', process: 'P2' }],
      requests: [{ process: 'P2', resource: 'R1' }, { process: 'P3', resource: 'R2' }]
    }
  }
};
