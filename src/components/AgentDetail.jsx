import React, { useState, useEffect, useRef } from 'react';

function relativeTime(isoString) {
  if (!isoString) return '';
  const diff = Math.max(0, Date.now() - new Date(isoString).getTime());
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export default function AgentDetail({ session, agents = [], onClose }) {
  const [output, setOutput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const outputRef = useRef(null);

  // Find the matching agent metadata
  const agent = agents.find(a => {
    if (a.id === session) return true;
    // Try common mapping patterns for infrastructure agents
    const mapped = session
      .replace('gt-gastown-', 'gs-gastown-')
      .replace('gt-slop-', 'sl-slop-');
    if (a.id === mapped) return true;
    // Try polecat pattern: gt-gastown-furiosa -> gs-gastown-polecat-furiosa
    const polecatMatch = session.match(/^gt-(\w+)-(.+)$/);
    if (polecatMatch && a.id === `gs-${polecatMatch[1]}-polecat-${polecatMatch[2]}`) return true;
    return false;
  });

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function capture() {
      try {
        const res = await fetch(`/api/sessions/${encodeURIComponent(session)}`);
        const data = await res.json();
        if (!cancelled) setOutput(data.output || '');
      } catch {
        if (!cancelled) setOutput('(failed to capture output)');
      }
    }

    capture();
    const interval = setInterval(capture, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [session]);

  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!session) return null;

  const displayName = session.replace(/^(gt|hq)-/, '').replace(/-/g, '/');
  const state = agent?.agent_state || 'unknown';
  const role = agent?.role_type || '';
  const hookBead = agent?.hook_bead || '';

  return (
    <div className="agent-detail-overlay" onClick={onClose}>
      <div className="agent-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="agent-detail-header">
          <div className="agent-detail-info">
            <span className="agent-detail-name">{displayName}</span>
            {role && <span className="agent-detail-role">{role}</span>}
            <span className={`agent-detail-state agent-detail-state--${state}`}>{state}</span>
            {hookBead && <span className="agent-detail-hook">{hookBead}</span>}
          </div>
          <div className="agent-detail-controls">
            <button
              className={`agent-detail-scroll-toggle ${autoScroll ? 'active' : ''}`}
              onClick={() => setAutoScroll(s => !s)}
              title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
            >
              {autoScroll ? 'Auto' : 'Manual'}
            </button>
            <button className="agent-detail-close" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>
        <div className="agent-detail-terminal" ref={outputRef}>
          {output || '(no output)'}
        </div>
      </div>
    </div>
  );
}
