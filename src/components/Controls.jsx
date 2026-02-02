import React, { useState } from 'react';

export default function Controls({ daemon }) {
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  async function run(cmd, args) {
    setRunning(true);
    setOutput('Running...');
    try {
      const res = await fetch('/api/cmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd, args }),
      });
      const data = await res.json();
      setOutput(data.stdout || data.stderr || data.error || 'Done');
    } catch (e) {
      setOutput('Error: ' + e.message);
    }
    setRunning(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--text-dim)' }}>
        Daemon: {daemon.running
          ? <span style={{ color: 'var(--green)' }}>Running</span>
          : <span style={{ color: 'var(--red)' }}>Stopped</span>
        }
      </div>

      <button
        className="control-btn primary"
        disabled={running}
        onClick={() => run('gt', ['daemon', 'start'])}
      >
        Boot Daemon
      </button>

      <button
        className="control-btn"
        disabled={running}
        onClick={() => run('gt', ['daemon', 'status'])}
      >
        Daemon Status
      </button>

      <button
        className="control-btn"
        disabled={running}
        onClick={() => run('gt', ['mail', 'inbox'])}
      >
        Check Mail
      </button>

      <button
        className="control-btn"
        disabled={running}
        onClick={() => run('bd', ['list', '--json'])}
      >
        List Beads
      </button>

      <button
        className="control-btn"
        disabled={running}
        onClick={() => run('bd', ['ready'])}
      >
        Ready Issues
      </button>

      <button
        className="control-btn"
        disabled={running}
        onClick={() => run('gt', ['session', 'list'])}
      >
        Sessions
      </button>

      {output && <div className="cmd-output">{output}</div>}
    </div>
  );
}
