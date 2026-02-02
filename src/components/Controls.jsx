import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function Controls({ daemon, agents = [] }) {
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [customCmd, setCustomCmd] = useState('');
  const [flashBtn, setFlashBtn] = useState(null);
  const [polecats, setPolecats] = useState([]);
  const [polecatsLoading, setPolecatsLoading] = useState(false);
  const [spawnRig, setSpawnRig] = useState('');
  const [spawnName, setSpawnName] = useState('');
  const [confirmNuke, setConfirmNuke] = useState(null);
  const outputRef = useRef(null);

  const fetchPolecats = useCallback(async () => {
    try {
      setPolecatsLoading(true);
      const res = await fetch('/api/polecats');
      const data = await res.json();
      if (Array.isArray(data)) setPolecats(data);
    } catch { /* ignore */ }
    finally { setPolecatsLoading(false); }
  }, []);

  useEffect(() => {
    fetchPolecats();
    const interval = setInterval(fetchPolecats, 10000);
    return () => clearInterval(interval);
  }, [fetchPolecats]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function run(cmd, args, btnKey) {
    setRunning(true);
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setOutput(prev => (prev ? prev + '\n' : '') + `[${ts}] $ ${cmd} ${args.join(' ')}\n Running...`);
    try {
      const res = await fetch('/api/cmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd, args }),
      });
      const data = await res.json();
      const result = data.stdout || data.stderr || data.error || 'Done';
      const isError = !data.ok || data.error;
      const ts2 = new Date().toLocaleTimeString('en-US', { hour12: false });
      setOutput(prev => {
        const lines = prev.split('\n');
        lines.pop(); // remove " Running..."
        const prefix = isError ? '✗' : '✓';
        return lines.join('\n') + `\n[${ts2}] ${prefix} ${result}`;
      });
      if (!isError && btnKey) {
        setFlashBtn(btnKey);
        setTimeout(() => setFlashBtn(null), 600);
      }
    } catch (e) {
      const ts2 = new Date().toLocaleTimeString('en-US', { hour12: false });
      setOutput(prev => {
        const lines = prev.split('\n');
        lines.pop();
        return lines.join('\n') + `\n[${ts2}] ✗ Error: ${e.message}`;
      });
    }
    setRunning(false);
  }

  async function restart() {
    await run('gt', ['down'], null);
    await run('gt', ['up'], 'restart');
  }

  function handleCustomCmd(e) {
    e.preventDefault();
    const trimmed = customCmd.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('gt ') && !trimmed.startsWith('bd ')) return;
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);
    run(cmd, args, null);
    setCustomCmd('');
  }

  async function handleSpawn(e) {
    e.preventDefault();
    const rig = spawnRig.trim();
    const name = spawnName.trim();
    if (!rig || !name) return;
    await run('gt', ['session', 'start', `${rig}/${name}`], `spawn-${name}`);
    setSpawnRig('');
    setSpawnName('');
    setTimeout(fetchPolecats, 2000);
  }

  async function handleNuke(rig, name) {
    await run('gt', ['polecat', 'nuke', `${rig}/${name}`], `nuke-${name}`);
    setConfirmNuke(null);
    setTimeout(fetchPolecats, 2000);
  }

  // Parse daemon info
  const daemonOutput = daemon.output || '';
  const pidMatch = daemonOutput.match(/PID[:\s]+(\d+)/i);
  const daemonPid = pidMatch ? pidMatch[1] : null;

  // Parse agent names from agents prop
  const agentNames = agents
    .map(a => {
      const title = a.title || '';
      const match = title.match(/gs-\S*polecat-(\w+)/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  return (
    <div className="controls-panel">
      {/* Daemon Status */}
      <div className={`daemon-status ${daemon.running ? 'daemon-running' : 'daemon-stopped'}`}>
        <div className="daemon-indicator">
          <span className={`daemon-dot ${daemon.running ? 'active' : ''}`} />
          <span className="daemon-label">
            {daemon.running ? 'Daemon Running' : 'Daemon Stopped'}
          </span>
        </div>
        {daemon.running && daemonPid && (
          <div className="daemon-detail">PID {daemonPid}</div>
        )}
      </div>

      {/* Service Controls */}
      <div className="btn-group">
        <div className="btn-group-label">Service</div>
        <button
          className={`control-btn success ${flashBtn === 'start' ? 'flash' : ''}`}
          disabled={running}
          onClick={() => run('gt', ['up'], 'start')}
        >
          ▶ Start All
        </button>
        <button
          className={`control-btn danger ${flashBtn === 'stop' ? 'flash' : ''}`}
          disabled={running}
          onClick={() => run('gt', ['down'], 'stop')}
        >
          ■ Stop All
        </button>
        <button
          className={`control-btn ${flashBtn === 'restart' ? 'flash' : ''}`}
          disabled={running}
          onClick={restart}
        >
          ↻ Restart
        </button>
      </div>

      {/* Agent Controls */}
      {agentNames.length > 0 && (
        <div className="btn-group">
          <div className="btn-group-label">Agents</div>
          <div className="agent-controls">
            {agentNames.map(name => (
              <div key={name} className="agent-ctrl-row">
                <span className="agent-ctrl-name">{name}</span>
                <button
                  className="control-btn-mini"
                  disabled={running}
                  title={`Peek at ${name}`}
                  onClick={() => run('gt', ['peek', name], `peek-${name}`)}
                >
                  👁
                </button>
                <button
                  className="control-btn-mini"
                  disabled={running}
                  title={`Nudge ${name}`}
                  onClick={() => run('gt', ['nudge', name, 'wake up'], `nudge-${name}`)}
                >
                  🔔
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Polecat Management */}
      <div className="btn-group">
        <div className="btn-group-label">
          Polecats
          <span className="polecat-count">{polecats.length}</span>
          <button
            className="polecat-refresh"
            onClick={fetchPolecats}
            disabled={polecatsLoading}
            title="Refresh polecat list"
          >
            {polecatsLoading ? '...' : '\u21BB'}
          </button>
        </div>

        {polecats.length === 0 && !polecatsLoading && (
          <div className="polecat-empty">No active polecats</div>
        )}

        {polecats.length > 0 && (
          <div className="polecat-list">
            {polecats.map(p => {
              const key = `${p.rig}/${p.name}`;
              const isConfirming = confirmNuke === key;
              return (
                <div key={key} className={`polecat-row polecat-row--${p.state}`}>
                  <div className="polecat-info">
                    <span className="polecat-name">{p.name}</span>
                    <span className="polecat-rig">{p.rig}</span>
                    <span className={`polecat-state polecat-state--${p.state}`}>{p.state}</span>
                    {p.session_running && <span className="polecat-session" title="Session running">{'\u2588'}</span>}
                  </div>
                  <div className="polecat-actions">
                    <button
                      className="control-btn-mini"
                      disabled={running}
                      title={`Check status of ${key}`}
                      onClick={() => run('gt', ['polecat', 'status', key, '--json'], `status-${p.name}`)}
                    >
                      ?
                    </button>
                    <button
                      className="control-btn-mini"
                      disabled={running}
                      title={`Peek at ${p.name}`}
                      onClick={() => run('gt', ['peek', key], `peek-${p.name}`)}
                    >
                      {'\u25D1'}
                    </button>
                    {!p.session_running && (
                      <button
                        className={`control-btn-mini polecat-spawn-btn ${flashBtn === `spawn-${p.name}` ? 'flash' : ''}`}
                        disabled={running}
                        title={`Start session for ${key}`}
                        onClick={() => run('gt', ['session', 'start', key], `spawn-${p.name}`)}
                      >
                        {'\u25B6'}
                      </button>
                    )}
                    {p.session_running && (
                      <button
                        className={`control-btn-mini polecat-stop-btn ${flashBtn === `stop-${p.name}` ? 'flash' : ''}`}
                        disabled={running}
                        title={`Stop session for ${key}`}
                        onClick={() => run('gt', ['session', 'stop', key], `stop-${p.name}`)}
                      >
                        {'\u25A0'}
                      </button>
                    )}
                    {isConfirming ? (
                      <>
                        <button
                          className="control-btn-mini polecat-nuke-confirm"
                          disabled={running}
                          onClick={() => handleNuke(p.rig, p.name)}
                        >
                          {'\u2713'}
                        </button>
                        <button
                          className="control-btn-mini"
                          onClick={() => setConfirmNuke(null)}
                        >
                          {'\u2717'}
                        </button>
                      </>
                    ) : (
                      <button
                        className="control-btn-mini polecat-nuke-btn"
                        disabled={running}
                        title={`Nuke ${key}`}
                        onClick={() => setConfirmNuke(key)}
                      >
                        {'\u2620'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Spawn new session */}
        <form onSubmit={handleSpawn} className="polecat-spawn-form">
          <input
            type="text"
            className="cmd-input polecat-input"
            value={spawnRig}
            onChange={e => setSpawnRig(e.target.value)}
            placeholder="rig"
            disabled={running}
          />
          <span className="polecat-slash">/</span>
          <input
            type="text"
            className="cmd-input polecat-input"
            value={spawnName}
            onChange={e => setSpawnName(e.target.value)}
            placeholder="name"
            disabled={running}
          />
          <button
            type="submit"
            className="control-btn success polecat-spawn-submit"
            disabled={running || !spawnRig.trim() || !spawnName.trim()}
          >
            Spawn
          </button>
        </form>
      </div>

      {/* Quick Commands */}
      <div className="btn-group">
        <div className="btn-group-label">Quick Commands</div>
        <button
          className={`control-btn ${flashBtn === 'mail' ? 'flash' : ''}`}
          disabled={running}
          onClick={() => run('gt', ['mail', 'inbox'], 'mail')}
        >
          Check Mail
        </button>
        <button
          className={`control-btn ${flashBtn === 'beads' ? 'flash' : ''}`}
          disabled={running}
          onClick={() => run('bd', ['list', '--json'], 'beads')}
        >
          List Beads
        </button>
        <button
          className={`control-btn ${flashBtn === 'ready' ? 'flash' : ''}`}
          disabled={running}
          onClick={() => run('bd', ['ready'], 'ready')}
        >
          Ready Issues
        </button>
        <button
          className={`control-btn ${flashBtn === 'sessions' ? 'flash' : ''}`}
          disabled={running}
          onClick={() => run('gt', ['session', 'list'], 'sessions')}
        >
          Sessions
        </button>
        <button
          className={`control-btn ${flashBtn === 'doctor' ? 'flash' : ''}`}
          disabled={running}
          onClick={() => run('gt', ['doctor'], 'doctor')}
        >
          Doctor
        </button>
        <button
          className={`control-btn ${flashBtn === 'trail' ? 'flash' : ''}`}
          disabled={running}
          onClick={() => run('gt', ['trail', 'beads'], 'trail')}
        >
          Trail
        </button>
      </div>

      {/* Custom Command Input */}
      <div className="btn-group">
        <div className="btn-group-label">Command</div>
        <form onSubmit={handleCustomCmd} className="cmd-input-form">
          <input
            type="text"
            className="cmd-input"
            value={customCmd}
            onChange={e => setCustomCmd(e.target.value)}
            placeholder="gt ... or bd ..."
            disabled={running}
          />
        </form>
      </div>

      {/* Output Box */}
      {output && (
        <div className="output-section">
          <div className="output-header">
            <span>Output</span>
            <button
              className="output-clear"
              onClick={() => setOutput('')}
            >
              Clear
            </button>
          </div>
          <div className="cmd-output" ref={outputRef}>{output}</div>
        </div>
      )}
    </div>
  );
}
