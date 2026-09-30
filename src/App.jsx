import { useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowRight, Boxes, Check,
  CircleHelp, Clock3, Cpu, Database, HardDrive, Layers3, ListRestart, LoaderCircle,
  Pause, Play, Plus, RotateCcw, Save, ShieldCheck, SkipForward, Trash2, Wifi, WifiOff, X
} from 'lucide-react';
import { api, post, socket } from './api.js';

const emptyModel = { processes: [], resources: [], allocations: [], requests: [] };

function clockLabel(tick = 0) {
  const minutes = Math.floor(tick / 60).toString().padStart(2, '0');
  const seconds = (tick % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function statusLabel(status = 'staged') {
  return ({ ready: 'Ready', running: 'Running', blocked: 'Blocked', deadlocked: 'Deadlocked', completed: 'Completed', terminated: 'Terminated', paused: 'Paused', waiting: 'Waiting', complete: 'Complete', resolved: 'Resolved' })[status] || status;
}

function statePercent(process) {
  if (!process) return 0;
  if (process.status === 'completed' || process.status === 'terminated') return 100;
  if (!process.workTotal) return 0;
  return Math.max(0, Math.min(100, Math.round((process.workTotal - process.workRemaining) / process.workTotal * 100)));
}

function ResourceGraph({ model, run }) {
  const processes = run?.processes || model.processes.map(id => ({ id, status: 'ready' }));
  const resources = run?.model.resources || model.resources;
  const allocations = run?.allocations || model.allocations;
  const requests = run?.activeRequests || model.requests;
  const height = Math.max(250, Math.max(processes.length, resources.length) * 66 + 72);
  const processY = new Map(processes.map((process, index) => [process.id, processes.length === 1 ? height / 2 : 42 + index * (height - 84) / (processes.length - 1)]));
  const resourceY = new Map(resources.map((resource, index) => [resource, resources.length === 1 ? height / 2 : 42 + index * (height - 84) / (resources.length - 1)]));
  const blocked = new Set(run?.deadlocks?.flatMap(cycle => cycle.processes) || []);

  return (
    <div className="graph-scroll">
      <svg className="rag-graph" viewBox={`0 0 720 ${height}`} role="img" aria-label="Live resource allocation graph">
        <defs>
          <marker id="arrow-allocation" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          <marker id="arrow-request" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
        </defs>
        <text className="graph-column-label" x="150" y="22" textAnchor="middle">PROCESSES</text>
        <text className="graph-column-label" x="570" y="22" textAnchor="middle">RESOURCES</text>
        {allocations.map((edge, index) => {
          const y1 = resourceY.get(edge.resource);
          const y2 = processY.get(edge.process);
          if (y1 === undefined || y2 === undefined) return null;
          const isCycle = blocked.has(edge.process);
          return <path key={`a-${edge.resource}-${edge.process}-${index}`} className={`graph-edge allocation ${isCycle ? 'cycle' : ''}`} d={`M 532 ${y1} C 420 ${y1}, 300 ${y2}, 188 ${y2}`} markerEnd="url(#arrow-allocation)" />;
        })}
        {requests.map((edge, index) => {
          const y1 = processY.get(edge.process);
          const y2 = resourceY.get(edge.resource);
          if (y1 === undefined || y2 === undefined) return null;
          return <path key={`r-${edge.process}-${edge.resource}-${index}`} className="graph-edge request" d={`M 188 ${y1} C 310 ${y1}, 420 ${y2}, 532 ${y2}`} markerEnd="url(#arrow-request)" />;
        })}
        {processes.map(process => {
          const y = processY.get(process.id);
          const isDeadlocked = blocked.has(process.id);
          return (
            <g key={`p-${process.id}`} className={`graph-process ${isDeadlocked ? 'deadlocked' : ''}`}>
              <circle cx="150" cy={y} r="24" />
              <text x="150" y={y + 4} textAnchor="middle">{process.id}</text>
            </g>
          );
        })}
        {resources.map(resource => {
          const y = resourceY.get(resource);
          const owner = allocations.find(edge => edge.resource === resource)?.process;
          return (
            <g key={`r-${resource}`} className={`graph-resource ${owner ? 'held' : ''}`}>
              <rect x="532" y={y - 16} width="76" height="32" rx="5" />
              <text x="570" y={y + 4} textAnchor="middle">{resource}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function App() {
  const [apiOnline, setApiOnline] = useState(false);
  const [socketOnline, setSocketOnline] = useState(false);
  const [presets, setPresets] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [recentRuns, setRecentRuns] = useState([]);
  const [model, setModel] = useState(emptyModel);
  const [run, setRun] = useState(null);
  const [scenarioName, setScenarioName] = useState('Untitled scenario');
  const [scenarioToLoad, setScenarioToLoad] = useState('');
  const [runToLoad, setRunToLoad] = useState('');
  const [processInput, setProcessInput] = useState('');
  const [resourceInput, setResourceInput] = useState('');
  const [allocationProcess, setAllocationProcess] = useState('');
  const [allocationResource, setAllocationResource] = useState('');
  const [requestProcess, setRequestProcess] = useState('');
  const [requestResource, setRequestResource] = useState('');
  const [resolutionProcess, setResolutionProcess] = useState('');
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [speed, setSpeed] = useState(900);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([api('/api/health'), api('/api/presets'), api('/api/scenarios'), api('/api/simulations')])
      .then(([health, presetData, scenarioData, runData]) => {
        if (!mounted) return;
        setApiOnline(health.status === 'ok');
        setPresets(presetData);
        setScenarios(scenarioData);
        setRecentRuns(runData);
      })
      .catch(error => {
        if (!mounted) return;
        setApiOnline(false);
        setNotice(`Backend unavailable: ${error.message}`);
      });

    const onConnect = () => setSocketOnline(true);
    const onDisconnect = () => setSocketOnline(false);
    const onUpdate = incoming => setRun(current => current?.id === incoming.id ? incoming : current);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('simulation:update', onUpdate);
    socket.connect();
    return () => {
      mounted = false;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('simulation:update', onUpdate);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socketOnline && run?.id) socket.emit('simulation:join', run.id);
  }, [socketOnline, run?.id]);

  const processStates = run?.processes || [];
  const allocations = run?.allocations || model.allocations;
  const resourceCount = run?.model.resources.length || model.resources.length;
  const runningCount = processStates.filter(process => process.status === 'running').length;
  const blockedCount = processStates.filter(process => ['blocked', 'deadlocked'].includes(process.status)).length;
  const occupiedCount = new Set(allocations.map(item => item.resource)).size;
  const cycleProcesses = [...new Set(run?.deadlocks?.flatMap(cycle => cycle.processes) || [])];
  const resolutionCandidates = cycleProcesses.length ? cycleProcesses : processStates.filter(process => process.status === 'deadlocked').map(process => process.id);
  const completedCount = processStates.filter(process => ['completed', 'terminated'].includes(process.status)).length;
  const cpuLoad = run?.tick ? Math.round(run.cpu.busyTicks / run.tick * 100) : 0;
  const appStatus = !apiOnline ? 'offline' : run?.status === 'deadlocked' ? 'deadlock' : run?.status === 'running' ? 'running' : run?.status === 'complete' ? 'complete' : 'ready';

  function updateModel(updater) {
    setModel(current => typeof updater === 'function' ? updater(current) : updater);
  }

  function addProcess() {
    const value = processInput.trim();
    if (!value || [...model.processes, ...model.resources].includes(value)) return setNotice('Use a non-empty name that is unique across processes and resources.');
    if (model.processes.length >= 50) return setNotice('The simulator supports up to 50 processes.');
    updateModel(current => ({ ...current, processes: [...current.processes, value] }));
    setProcessInput('');
    setNotice('');
  }

  function addResource() {
    const value = resourceInput.trim();
    if (!value || [...model.processes, ...model.resources].includes(value)) return setNotice('Use a non-empty name that is unique across processes and resources.');
    if (model.resources.length >= 50) return setNotice('The simulator supports up to 50 resources.');
    updateModel(current => ({ ...current, resources: [...current.resources, value] }));
    setResourceInput('');
    setNotice('');
  }

  function addAllocation() {
    if (!allocationProcess || !allocationResource) return;
    if (model.allocations.some(item => item.resource === allocationResource)) return setNotice(`${allocationResource} already has a holder.`);
    updateModel(current => ({ ...current, allocations: [...current.allocations, { process: allocationProcess, resource: allocationResource }] }));
    setNotice('');
  }

  function addRequest() {
    if (!requestProcess || !requestResource) return;
    if (model.requests.some(item => item.process === requestProcess && item.resource === requestResource)) return setNotice('That request already exists.');
    updateModel(current => ({ ...current, requests: [...current.requests, { process: requestProcess, resource: requestResource }] }));
    setNotice('');
  }

  function removeProcess(id) {
    updateModel(current => ({
      ...current,
      processes: current.processes.filter(value => value !== id),
      allocations: current.allocations.filter(item => item.process !== id),
      requests: current.requests.filter(item => item.process !== id)
    }));
  }

  function removeResource(id) {
    updateModel(current => ({
      ...current,
      resources: current.resources.filter(value => value !== id),
      allocations: current.allocations.filter(item => item.resource !== id),
      requests: current.requests.filter(item => item.resource !== id)
    }));
  }

  function removeRelation(collection, index) {
    updateModel(current => ({ ...current, [collection]: current[collection].filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function pauseCurrentRun() {
    if (!run || !['running', 'waiting'].includes(run.status)) return;
    const result = await post(`/api/simulations/${run.id}/pause`);
    setRun(result.state);
  }

  async function loadPreset(id) {
    const preset = presets.find(item => item.id === id);
    if (!preset) return;
    try {
      await pauseCurrentRun();
    } catch (error) {
      setNotice(error.message);
      return;
    }
    setModel(preset.model);
    setScenarioName(preset.name);
    setRun(null);
    setRunToLoad('');
    setNotice(`${preset.name} loaded into the configuration.`);
  }

  async function refreshLists() {
    const [scenarioData, runData] = await Promise.all([api('/api/scenarios'), api('/api/simulations')]);
    setScenarios(scenarioData);
    setRecentRuns(runData);
  }

  async function saveScenario() {
    if (!scenarioName.trim()) return setNotice('Give the scenario a name before saving.');
    setBusy(true);
    try {
      const saved = await post('/api/scenarios', { name: scenarioName.trim(), model });
      await refreshLists();
      setScenarioToLoad(saved.id);
      setNotice(`Saved “${saved.name}” to the local database.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadScenario() {
    if (!scenarioToLoad) return;
    setBusy(true);
    try {
      await pauseCurrentRun();
      const saved = await api(`/api/scenarios/${scenarioToLoad}`);
      setModel(saved.model);
      setScenarioName(saved.name);
      setRun(null);
      setNotice(`Loaded “${saved.name}” from SQLite.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteScenario() {
    if (!scenarioToLoad) return;
    setBusy(true);
    try {
      await api(`/api/scenarios/${scenarioToLoad}`, { method: 'DELETE' });
      setScenarioToLoad('');
      await refreshLists();
      setNotice('Scenario removed from the local database.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadRun() {
    if (!runToLoad) return;
    setBusy(true);
    try {
      if (run?.id !== runToLoad) await pauseCurrentRun();
      const result = await api(`/api/simulations/${runToLoad}`);
      setRun(result.state);
      setModel(result.state.model);
      setScenarioName(result.state.scenarioName);
      setNotice('Stored run restored. It is paused until you resume it.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function createRun() {
    const result = await post('/api/simulations', { model, scenarioName: scenarioName.trim() || 'Live simulation' });
    setRun(result.state);
    await refreshLists();
    return result.state;
  }

  async function control(action) {
    if (busy) return;
    setBusy(true);
    try {
      let currentRun = run;
      if (!currentRun && ['start', 'step'].includes(action)) currentRun = await createRun();
      if (!currentRun) return setNotice('Create a simulation before using runtime controls.');
      const result = action === 'start'
        ? await post(`/api/simulations/${currentRun.id}/start`, { tickMs: Number(speed) })
        : await post(`/api/simulations/${currentRun.id}/${action}`);
      setRun(result.state);
      if (action === 'start') setNotice('Simulation running on the backend.');
      if (action === 'reset') setNotice('Run reset to its configured initial state.');
      if (['step', 'pause'].includes(action)) setNotice('');
      await refreshLists();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeSpeed(value) {
    setSpeed(value);
    if (run?.status !== 'running') return;
    try {
      const result = await post(`/api/simulations/${run.id}/speed`, { tickMs: value });
      setRun(result.state);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function createNewRun() {
    try {
      await pauseCurrentRun();
    } catch (error) {
      setNotice(error.message);
      return;
    }
    setRun(null);
    setRunToLoad('');
    setNotice('Configuration ready for a new simulation run.');
  }

  async function resolveSelectedProcess() {
    if (!run || !resolutionProcess) return;
    setBusy(true);
    try {
      const result = await post(`/api/simulations/${run.id}/resolve`, { processId: resolutionProcess });
      setRun(result.state);
      setResolutionOpen(false);
      setResolutionProcess('');
      await refreshLists();
      setNotice(`You terminated ${result.state.resolution?.process || resolutionProcess}; released resources are back in the system.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  const activeRequests = run?.activeRequests || [];
  const runtimeResources = run?.model.resources || model.resources;
  const runtimeAllocations = run?.allocations || model.allocations;
  const processRows = run?.processes || model.processes.map(id => ({ id, status: 'ready', phase: 'Configured', workRemaining: 1, workTotal: 1 }));
  const recentEvents = [...(run?.events || [])].reverse().slice(0, 12);
  const selectedVictim = processRows.find(process => process.id === resolutionProcess);
  const victimResources = runtimeAllocations.filter(item => item.process === resolutionProcess).map(item => item.resource);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Deadlock Runtime Lab home">
          <span className="brand-mark"><Activity size={19} strokeWidth={2.5} /></span>
          <span><strong>DEADLOCK<span>LAB</span></strong><small>OPERATING SYSTEMS SIMULATOR</small></span>
        </a>
        <div className="topbar-right">
          <div className={`service-status ${apiOnline ? 'online' : 'offline'}`}><Database size={14} />{apiOnline ? 'API · SQLITE' : 'API OFFLINE'}</div>
          <div className={`socket-status ${socketOnline ? 'online' : ''}`}>{socketOnline ? <Wifi size={14} /> : <WifiOff size={14} />}{socketOnline ? 'LIVE STREAM' : 'STREAM OFFLINE'}</div>
        </div>
      </header>

      <main id="top">
        <section className="page-heading">
          <div>
            <p className="eyebrow">SYSTEMS SIMULATION <span>/</span> RESOURCE CONTENTION</p>
            <h1>Deadlock <em>Runtime</em></h1>
          </div>
          <div className={`run-state ${appStatus}`}><span className="run-state-dot" />{run ? statusLabel(run.status).toUpperCase() : 'STAGED SYSTEM'}</div>
        </section>

        <div className="notice-slot" aria-live="polite">{notice && <div className="notice"><CircleHelp size={15} /><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}><X size={14} /></button></div>}</div>

        <div className="layout">
          <aside className="sidebar">
            <section className="side-section setup-section">
              <div className="section-title"><span className="section-index">01</span><div><h2>System setup</h2><p>Processes · resources · dependencies</p></div></div>
              <div className="field-block">
                <label htmlFor="process-name">Processes</label>
                <form className="entry-row" onSubmit={event => { event.preventDefault(); addProcess(); }}>
                  <input id="process-name" value={processInput} maxLength={32} onChange={event => setProcessInput(event.target.value)} placeholder="e.g. P1" />
                  <button className="icon-button add-button" type="submit" aria-label="Add process"><Plus size={16} /></button>
                </form>
                <div className="tag-list">{model.processes.map(id => <span className="entity-tag process-tag" key={id}>{id}<button type="button" onClick={() => removeProcess(id)} aria-label={`Remove process ${id}`}><X size={11} /></button></span>)}</div>
              </div>
              <div className="field-block">
                <label htmlFor="resource-name">Resources <span>single instance</span></label>
                <form className="entry-row" onSubmit={event => { event.preventDefault(); addResource(); }}>
                  <input id="resource-name" value={resourceInput} maxLength={32} onChange={event => setResourceInput(event.target.value)} placeholder="e.g. R1" />
                  <button className="icon-button add-button" type="submit" aria-label="Add resource"><Plus size={16} /></button>
                </form>
                <div className="tag-list">{model.resources.map(id => <span className="entity-tag resource-tag" key={id}>{id}<button type="button" onClick={() => removeResource(id)} aria-label={`Remove resource ${id}`}><X size={11} /></button></span>)}</div>
              </div>
              <div className="field-block">
                <label htmlFor="allocation-process">Resource allocation</label>
                <div className="relation-row">
                  <select id="allocation-resource" aria-label="Resource to allocate" value={allocationResource} onChange={event => setAllocationResource(event.target.value)}><option value="">Resource</option>{model.resources.map(value => <option key={value}>{value}</option>)}</select>
                  <ArrowRight size={14} />
                  <select id="allocation-process" value={allocationProcess} onChange={event => setAllocationProcess(event.target.value)}><option value="">Process</option>{model.processes.map(value => <option key={value}>{value}</option>)}</select>
                  <button className="icon-button add-button" type="button" aria-label="Add allocation" onClick={addAllocation}><Plus size={16} /></button>
                </div>
                <div className="relation-list">{model.allocations.map((item, index) => <div className="relation-chip" key={`${item.resource}-${item.process}`}><span>{item.resource} <ArrowRight size={11} /> {item.process}</span><button type="button" onClick={() => removeRelation('allocations', index)} aria-label={`Remove allocation ${item.resource} to ${item.process}`}><X size={12} /></button></div>)}</div>
              </div>
              <div className="field-block">
                <label htmlFor="request-process">Resource requests</label>
                <div className="relation-row">
                  <select id="request-process" value={requestProcess} onChange={event => setRequestProcess(event.target.value)}><option value="">Process</option>{model.processes.map(value => <option key={value}>{value}</option>)}</select>
                  <ArrowRight size={14} />
                  <select id="request-resource" aria-label="Requested resource" value={requestResource} onChange={event => setRequestResource(event.target.value)}><option value="">Resource</option>{model.resources.map(value => <option key={value}>{value}</option>)}</select>
                  <button className="icon-button add-button" type="button" aria-label="Add request" onClick={addRequest}><Plus size={16} /></button>
                </div>
                <div className="relation-list">{model.requests.map((item, index) => <div className="relation-chip request-chip" key={`${item.process}-${item.resource}`}><span>{item.process} <ArrowRight size={11} /> {item.resource}</span><button type="button" onClick={() => removeRelation('requests', index)} aria-label={`Remove request from ${item.process} to ${item.resource}`}><X size={12} /></button></div>)}</div>
              </div>
            </section>

            <section className="side-section scenario-section">
              <div className="section-title"><span className="section-index">02</span><div><h2>Scenario library</h2><p>Saved in the backend database</p></div></div>
              <div className="field-block compact-field"><label htmlFor="scenario-name">Scenario name</label><input id="scenario-name" value={scenarioName} maxLength={80} onChange={event => setScenarioName(event.target.value)} /></div>
              <button className="wide-button secondary-button" type="button" onClick={saveScenario} disabled={busy}><Save size={15} />Save scenario</button>
              <div className="select-row">
                <select aria-label="Saved scenarios" value={scenarioToLoad} onChange={event => setScenarioToLoad(event.target.value)}><option value="">Choose saved scenario</option>{scenarios.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <button className="icon-button" type="button" title="Load scenario" aria-label="Load scenario" disabled={!scenarioToLoad || busy} onClick={loadScenario}><ArrowDownToLine size={15} /></button>
                <button className="icon-button danger-icon" type="button" title="Delete scenario" aria-label="Delete scenario" disabled={!scenarioToLoad || busy} onClick={deleteScenario}><Trash2 size={15} /></button>
              </div>
              <div className="preset-list"><span className="micro-label">STARTER SYSTEMS</span>{presets.map(preset => <button type="button" className="preset-row" key={preset.id} onClick={() => loadPreset(preset.id)}><span>{preset.name}</span><ArrowRight size={14} /></button>)}</div>
              <div className="select-row history-select"><select aria-label="Recent simulation runs" value={runToLoad} onChange={event => setRunToLoad(event.target.value)}><option value="">Recent simulation runs</option>{recentRuns.map(item => <option value={item.id} key={item.id}>{item.scenarioName} · {statusLabel(item.status)} · {item.tick} ticks</option>)}</select><button className="icon-button" type="button" title="Restore run" aria-label="Restore run" disabled={!runToLoad || busy} onClick={loadRun}><Clock3 size={15} /></button></div>
            </section>
          </aside>

          <section className="monitor">
            <div className="metrics-grid">
              <article className="metric-card metric-cpu"><span className="metric-icon"><Cpu size={16} /></span><span className="metric-label">VIRTUAL CPU LOAD</span><strong>{cpuLoad}<small>%</small></strong><div className="metric-meter"><span style={{ width: `${cpuLoad}%` }} /></div></article>
              <article className="metric-card"><span className="metric-icon mint"><Activity size={16} /></span><span className="metric-label">RUNNING</span><strong>{runningCount}<small> / {processRows.length}</small></strong><span className="metric-note">{run?.cpu.dispatches || 0} dispatches</span></article>
              <article className="metric-card"><span className="metric-icon amber"><Clock3 size={16} /></span><span className="metric-label">WAITING / BLOCKED</span><strong>{blockedCount}<small> processes</small></strong><span className="metric-note">Round-robin queue</span></article>
              <article className="metric-card"><span className="metric-icon blue"><Boxes size={16} /></span><span className="metric-label">RESOURCES IN USE</span><strong>{occupiedCount}<small> / {resourceCount}</small></strong><span className="metric-note">Single-instance model</span></article>
            </div>

            <section className="monitor-panel runtime-panel">
              <div className="panel-heading"><div><span className="panel-kicker">LIVE EXECUTION</span><h2>Process scheduler</h2></div><div className="runtime-controls">
                <span className="sim-clock"><Clock3 size={14} />{clockLabel(run?.tick || 0)}</span>
                <select aria-label="Simulation speed" value={speed} onChange={event => changeSpeed(Number(event.target.value))}><option value={1200}>0.75×</option><option value={900}>1×</option><option value={450}>2×</option><option value={225}>4×</option></select>
                <button className="control-button start-control" type="button" onClick={() => control('start')} disabled={busy || ['running', 'deadlocked', 'complete'].includes(run?.status)}><Play size={14} />{run?.status === 'waiting' ? 'Resume' : 'Start'}</button>
                <button className="control-button" type="button" onClick={() => control('pause')} disabled={busy || !['running', 'waiting'].includes(run?.status)} title="Pause simulation"><Pause size={14} /></button>
                <button className="control-button" type="button" onClick={() => control('step')} disabled={busy || ['running', 'deadlocked', 'complete'].includes(run?.status)} title="Advance one tick"><SkipForward size={14} /></button>
                <button className="control-button" type="button" onClick={() => control('reset')} disabled={busy || !run} title="Reset run"><RotateCcw size={14} /></button>
                <button className="control-button new-run-button" type="button" onClick={createNewRun} disabled={busy} title="Prepare a new run"><ListRestart size={14} /><span>New run</span></button>
              </div></div>
              {!run && <div className="staged-banner"><Layers3 size={15} /><span>Configure a system, choose a starter scenario, then start a backend simulation.</span><button type="button" onClick={() => control('start')} disabled={busy || !model.processes.length || !model.resources.length}><Play size={13} />Start run</button></div>}
              {run && <div className="scheduler-strip"><div className={`core-status ${run.status}`}><span className="core-led" /><div><small>CPU CORE 01</small><strong>{run.cpu.currentProcess || (run.status === 'deadlocked' ? 'HALTED · DEADLOCK' : run.status === 'complete' ? 'ALL PROCESSES EXITED' : 'DISPATCH READY')}</strong></div></div><div className="scheduler-stats"><span>Tick <strong>{run.tick}</strong></span><span>Finished <strong>{completedCount}/{processRows.length}</strong></span><span>Stream <strong className={socketOnline ? 'stream-ok' : 'stream-down'}>{socketOnline ? 'Connected' : 'Offline'}</strong></span></div></div>}
              <div className="process-table-wrap"><table className="process-table"><thead><tr><th>PROCESS</th><th>STATE</th><th>EXECUTION PHASE</th><th>BURST</th><th>HELD RESOURCES</th></tr></thead><tbody>
                {processRows.length ? processRows.map(process => {
                  const held = allocations.filter(item => item.process === process.id).map(item => item.resource);
                  const progress = statePercent(process);
                  return <tr key={process.id}><td><span className={`process-avatar ${process.status}`}>{process.id.slice(0, 2)}</span><strong>{process.id}</strong></td><td><span className={`status-pill ${process.status}`}>{statusLabel(process.status)}</span></td><td><div className="phase-cell"><span>{process.phase || 'Queued'}</span><div className="burst-meter"><span style={{ width: `${progress}%` }} /></div></div></td><td className="mono-cell">{process.workRemaining ?? '—'} / {process.workTotal ?? '—'}</td><td>{held.length ? held.map(resource => <span className="resource-token" key={resource}>{resource}</span>) : <span className="muted">—</span>}</td></tr>;
                }) : <tr><td className="table-empty" colSpan="5">Load a starter system to populate the scheduler.</td></tr>}
              </tbody></table></div>
            </section>

            {run?.status === 'deadlocked' && <section className="deadlock-banner" role="alert"><div className="deadlock-symbol"><AlertTriangle size={20} /></div><div className="deadlock-copy"><span>DEADLOCK DETECTED · RUN PAUSED</span><h2>Resource wait cycle prevents progress</h2><p>{run.deadlocks.map((cycle, index) => <span key={index}>{cycle.edges.map((edge, edgeIndex) => <span key={edgeIndex}>{edge.from} <b>→ {edge.resource} →</b> </span>)}{cycle.edges.at(-1)?.to}</span>)}</p></div><button className="resolve-button" type="button" onClick={() => { setResolutionProcess(resolutionCandidates[0] || ''); setResolutionOpen(true); }}><ShieldCheck size={16} />Resolve deadlock</button></section>}
            {run?.deadlockResolved && run.status !== 'deadlocked' && <section className="resolved-banner"><span className="resolved-icon"><Check size={16} /></span><div><strong>Deadlock recovery applied</strong><span>{run.resolution?.process} terminated · {run.resolution?.releasedResources?.join(', ') || 'no held resources'} released</span></div></section>}

            <div className="lower-grid">
              <section className="monitor-panel resource-panel"><div className="panel-heading"><div><span className="panel-kicker">RESOURCE MAP</span><h2>Ownership & wait queue</h2></div><Boxes size={17} /></div><div className="resource-table">
                {runtimeResources.length ? runtimeResources.map(resource => {
                  const owner = runtimeAllocations.find(item => item.resource === resource)?.process;
                  const waiters = activeRequests.filter(item => item.resource === resource).map(item => item.process);
                  return <div className="resource-line" key={resource}><span className={`resource-shape ${owner ? 'in-use' : ''}`}><Boxes size={15} /></span><div className="resource-main"><strong>{resource}</strong><span>{owner ? `Owned by ${owner}` : 'Available'}</span></div><div className="resource-queue">{waiters.length ? <><span>WAIT QUEUE</span>{waiters.map(process => <i key={process}>{process}</i>)}</> : <span className="queue-clear">{owner ? 'EXCLUSIVE' : 'FREE'}</span>}</div></div>;
                }) : <div className="empty-state">Resources will appear after configuration.</div>}
              </div></section>

              <section className="monitor-panel events-panel"><div className="panel-heading"><div><span className="panel-kicker">PERSISTED TO SQLITE</span><h2>Execution trace</h2></div><span className="event-total">{run?.events?.length || 0} events</span></div><div className="event-list">
                {recentEvents.length ? recentEvents.map((event, index) => <div className="event-item" key={`${event.tick}-${event.kind}-${index}`}><time>{clockLabel(event.tick)}</time><span className={`event-type ${event.kind.toLowerCase()}`}>{event.kind}</span><p>{event.message}</p></div>) : <div className="empty-state">Backend events appear as the simulation advances.</div>}
              </div></section>
            </div>

            <section className="monitor-panel graph-panel"><div className="panel-heading"><div><span className="panel-kicker">LIVE RESOURCE ALLOCATION GRAPH</span><h2>Wait-for topology</h2></div><div className="graph-legend"><span><i className="legend-line allocation-line" />Allocation</span><span><i className="legend-line request-line" />Request</span></div></div><ResourceGraph model={model} run={run} /></section>
          </section>
        </div>
      </main>

      {resolutionOpen && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setResolutionOpen(false); }}><section className="resolve-modal" role="dialog" aria-modal="true" aria-labelledby="resolve-title"><div className="modal-top"><span className="modal-alert"><AlertTriangle size={18} /></span><button type="button" className="icon-button" onClick={() => setResolutionOpen(false)} aria-label="Close recovery dialog"><X size={16} /></button></div><p className="panel-kicker">MANUAL RECOVERY</p><h2 id="resolve-title">Choose a process to terminate</h2><p className="modal-description">The backend will stop the selected process, release its resources, persist the recovery action, and resume the remaining processes.</p><label htmlFor="victim-process">Deadlocked process</label><select id="victim-process" value={resolutionProcess} onChange={event => setResolutionProcess(event.target.value)}>{resolutionCandidates.map(id => <option value={id} key={id}>{id}{runtimeAllocations.filter(item => item.process === id).length ? ` · holds ${runtimeAllocations.filter(item => item.process === id).map(item => item.resource).join(', ')}` : ''}</option>)}</select>{selectedVictim && <div className="recovery-preview"><span>RESOURCES TO RELEASE</span><strong>{victimResources.length ? victimResources.join(' · ') : 'None held'}</strong></div>}<div className="modal-actions"><button className="control-button" type="button" onClick={() => setResolutionOpen(false)}>Cancel</button><button className="resolve-button" type="button" onClick={resolveSelectedProcess} disabled={busy || !resolutionProcess}>{busy ? <LoaderCircle className="spin" size={15} /> : <ShieldCheck size={15} />}Resolve & resume</button></div></section></div>}

      <footer><span><HardDrive size={13} />Local SQLite database · durable run history</span><span>Virtual single-core scheduler · single-instance resources</span></footer>
    </div>
  );
}

export default App;
