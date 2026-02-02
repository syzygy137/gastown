import React, { useState, useEffect, useRef, useCallback } from 'react';

function extractNudgeName(sessionName) {
  const m = sessionName.match(/^gt-\w+-(.+)$/);
  return m ? m[1] : null;
}

export default function FullscreenTerminal({ session, agents = [], onClose, onMinimize }) {
  const [output, setOutput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [nudgeText, setNudgeText] = useState('');
  const [nudgeSending, setNudgeSending] = useState(false);
  const [nudgeResult, setNudgeResult] = useState(null);
  const outputRef = useRef(null);
  const nudgeInputRef = useRef(null);

  // Find matching agent metadata
  const agent = agents.find(a => {
    if (a.id === session) return true;
    const mapped = session
      .replace('gt-gastown-', 'gs-gastown-')
      .replace('gt-slop-', 'sl-slop-');
    if (a.id === mapped) return true;
    const polecatMatch = session.match(/^gt-(\w+)-(.+)$/);
    if (polecatMatch && a.id === `gs-${polecatMatch[1]}-polecat-${polecatMatch[2]}`) return true;
    return false;
  });

  // Poll terminal output every 1.5s
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
    const interval = setInterval(capture, 1500);
    return () => { cancelled = true; clearInterval(interval); };
  }, [session]);

  // Auto-scroll with manual scroll lock
  const handleScroll = useCallback(() => {
    if (!outputRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = outputRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 30;
    if (!atBottom && autoScroll) setAutoScroll(false);
    if (atBottom && !autoScroll) setAutoScroll(true);
  }, [autoScroll]);

  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  // Keyboard: Escape to close, Ctrl+Enter to send nudge
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.ctrlKey && e.key === 'Enter' && nudgeInputRef.current) {
        e.preventDefault();
        nudgeInputRef.current.form?.requestSubmit();
        return;
      }
    }
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [onClose]);

  const nudgeName = session ? extractNudgeName(session) : null;

  async function sendNudge(e) {
    e.preventDefault();
    if (!nudgeName || !nudgeText.trim()) return;
    setNudgeSending(true);
    setNudgeResult(null);
    try {
      const res = await fetch('/api/cmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: 'gt', args: ['nudge', nudgeName, nudgeText.trim()] }),
      });
      const data = await res.json();
      if (res.ok) {
        setNudgeResult('sent');
        setNudgeText('');
      } else {
        setNudgeResult(data.error || 'error');
      }
    } catch {
      setNudgeResult('error');
    }
    setNudgeSending(false);
    setTimeout(() => setNudgeResult(null), 3000);
  }

  if (!session) return null;

  const displayName = session.replace(/^(gt|hq)-/, '').replace(/-/g, '/');
  const state = agent?.agent_state || 'unknown';
  const role = agent?.role_type || '';
  const hookBead = agent?.hook_bead || '';

  return (
    <div className="fs-terminal-overlay">
      <div className="fs-terminal">
        <div className="fs-terminal__header">
          <div className="fs-terminal__info">
            <span className="fs-terminal__name">{displayName}</span>
            {role && <span className="fs-terminal__role">{role}</span>}
            <span className={`fs-terminal__state fs-terminal__state--${state}`}>{state}</span>
            {hookBead && <span className="fs-terminal__hook">{hookBead}</span>}
          </div>
          <div className="fs-terminal__controls">
            <button
              className={`fs-terminal__scroll-toggle ${autoScroll ? 'active' : ''}`}
              onClick={() => setAutoScroll(s => !s)}
              title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
            >
              {autoScroll ? 'Auto' : 'Manual'}
            </button>
            {onMinimize && (
              <button className="fs-terminal__minimize" onClick={onMinimize} title="Minimize back to grid">
                &#9723;
              </button>
            )}
            <button className="fs-terminal__close" onClick={onClose} title="Close (Esc)">
              &times;
            </button>
          </div>
        </div>
        <div
          className="fs-terminal__output"
          ref={outputRef}
          onScroll={handleScroll}
        >
          {output || '(no output)'}
        </div>
        {nudgeName && (
          <form className="fs-terminal__nudge" onSubmit={sendNudge}>
            <input
              ref={nudgeInputRef}
              className="fs-terminal__nudge-input"
              type="text"
              placeholder={`Nudge ${nudgeName}... (Ctrl+Enter to send)`}
              value={nudgeText}
              onChange={e => setNudgeText(e.target.value)}
              disabled={nudgeSending}
              autoFocus
            />
            <button
              className={`fs-terminal__nudge-btn${nudgeResult === 'sent' ? ' fs-terminal__nudge-btn--sent' : ''}`}
              type="submit"
              disabled={nudgeSending || !nudgeText.trim()}
            >
              {nudgeSending ? '...' : nudgeResult === 'sent' ? 'Sent' : 'Send'}
            </button>
            {nudgeResult && nudgeResult !== 'sent' && (
              <span className="fs-terminal__nudge-error">{nudgeResult}</span>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
