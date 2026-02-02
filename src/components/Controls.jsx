import React, { useState, useRef, useEffect } from 'react';

export default function Controls({ daemon, agents = [] }) {
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [customCmd, setCustomCmd] = useState('');
  const [flashBtn, setFlashBtn] = useState(null);
  const outputRef = useRef(null);

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
