import React, { useState, useEffect } from 'react';

export default function TmuxViewer({ sessions }) {
  const [active, setActive] = useState(null);
  const [output, setOutput] = useState('');

  useEffect(() => {
    if (sessions?.length && !active) {
      setActive(sessions[0].name);
    }
  }, [sessions, active]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    async function capture() {
      try {
        const res = await fetch(`/api/sessions/${encodeURIComponent(active)}`);
        const data = await res.json();
        if (!cancelled) setOutput(data.output || '');
      } catch {
        if (!cancelled) setOutput('(failed to capture)');
      }
    }
    capture();
    const interval = setInterval(capture, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [active]);

  if (!sessions?.length) {
    return <div className="empty" style={{ padding: 20 }}>No tmux sessions</div>;
  }

  return (
    <div>
      <div className="session-tabs">
        {sessions.map(s => (
          <button
            key={s.name}
            className={`session-tab ${active === s.name ? 'active' : ''}`}
            onClick={() => setActive(s.name)}
          >
            {s.name} ({s.windows}w{s.attached ? ' *' : ''})
          </button>
        ))}
      </div>
      <div className="tmux-output">{output || '(empty)'}</div>
    </div>
  );
}
