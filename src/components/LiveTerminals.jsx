import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import StatusBadge from './StatusBadge.jsx';

const SESSION_MAP = {
  'hq-mayor': 'hq-mayor',
  'hq-deacon': 'hq-deacon',
  'sl-slop-witness': 'gt-slop-witness',
  'sl-slop-refinery': 'gt-slop-refinery',
  'gs-gastown-witness': 'gt-gastown-witness',
  'gs-gastown-refinery': 'gt-gastown-refinery',
};

function sessionToAgentId(sessionName) {
  return sessionName
    .replace('gt-gastown-', 'gs-gastown-')
    .replace('gt-slop-', 'sl-slop-');
}

function displayName(session) {
  return session.replace(/^(gt|hq)-/, '').replace(/-/g, '/');
}

const ERROR_RE = /\b(error|fail|fatal|panic|exception|ENOENT|EACCES|refused|crash)\b/i;
const TOOL_RE = /\b(Read|Write|Edit|Bash|Glob|Grep|Task|LSP)\b/;
const THINKING_RE = /\b(thinking|waiting|idle|blocked|pending)\b/i;
const SUCCESS_RE = /\b(success|complete|done|finished|merged|approved)\b/i;

function parseOutputStatus(output) {
  if (!output) return 'idle';
  const lines = output.split('\n');
  const tail = lines.slice(-8).join('\n');
  if (ERROR_RE.test(tail)) return 'error';
  if (TOOL_RE.test(tail)) return 'working';
  if (SUCCESS_RE.test(tail)) return 'success';
  if (THINKING_RE.test(tail)) return 'thinking';
  const nonEmpty = lines.filter(l => l.trim()).length;
  if (nonEmpty === 0) return 'idle';
  return 'active';
}

const STATUS_INDICATOR = {
  error:    { color: 'var(--red)',      label: 'ERR' },
  working:  { color: 'var(--green)',    label: 'RUN' },
  success:  { color: 'var(--cyan)',     label: 'OK'  },
  thinking: { color: 'var(--yellow)',   label: '...' },
  active:   { color: 'var(--green)',    label: 'ACT' },
  idle:     { color: 'var(--text-dim)', label: 'IDL' },
};

function TerminalPane({ session, output, agent, onSelect, onFullscreen, flash }) {
  const termRef = useRef(null);
  const [userScrolled, setUserScrolled] = useState(false);

  useEffect(() => {
    if (!userScrolled && termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [output, userScrolled]);

  const handleScroll = useCallback(() => {
    if (!termRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = termRef.current;
    setUserScrolled(scrollHeight - scrollTop - clientHeight > 30);
  }, []);

  const role = agent?.role_type || '';
  const agentState = agent?.agent_state || 'idle';
  const hookBead = agent?.hook_bead || '';
  const isActive = agentState === 'active' || agentState === 'in-progress' || agentState === 'in_progress';
  const outputStatus = useMemo(() => parseOutputStatus(output), [output]);
  const indicator = STATUS_INDICATOR[outputStatus];

  return (
    <div
      className={`tgrid-pane ${isActive ? 'tgrid-pane--active' : ''}${flash ? ' bg-flash' : ''}`}
      onClick={() => onSelect?.(session)}
    >
      <div className="tgrid-pane__header">
        <div className="tgrid-pane__title">
          <span
            className="tgrid-pane__status-dot"
            style={{ background: indicator.color, boxShadow: `0 0 4px ${indicator.color}` }}
            title={indicator.label}
          />
          <span
            className="tgrid-pane__name tgrid-pane__name--clickable"
            onClick={e => { e.stopPropagation(); onFullscreen?.(session); }}
            title="Open fullscreen terminal"
          >{displayName(session)}</span>
        </div>
        <div className="tgrid-pane__badges">
          {role && <StatusBadge value={role} />}
          <span className="tgrid-pane__status-tag" style={{ color: indicator.color }}>
            {indicator.label}
          </span>
        </div>
      </div>
      {hookBead && (
        <div className="tgrid-pane__hook">{hookBead}</div>
      )}
      <div
        className="tgrid-pane__terminal"
        ref={termRef}
        onScroll={handleScroll}
        onClick={e => e.stopPropagation()}
      >
        {output || '(no output)'}
      </div>
    </div>
  );
}

export default function LiveTerminals({ agents = [], onSelectAgent, onFullscreenAgent, changedIds = new Set() }) {
  const [captures, setCaptures] = useState({});
  const [cols, setCols] = useState(2);

  const agentMap = useMemo(() => {
    const map = {};
    for (const a of agents) {
      map[a.id] = a;
      const sessionName = SESSION_MAP[a.id] || a.id;
      map[sessionName] = a;
    }
    return map;
  }, [agents]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch('/api/sessions/all?lines=50');
        const data = await res.json();
        if (!cancelled && data.sessions) {
          setCaptures(data.sessions);
        }
      } catch { /* ignore */ }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const sessionNames = Object.keys(captures).sort();

  if (!sessionNames.length) {
    return (
      <div className="tgrid tgrid--empty">
        <div className="empty">No active terminal sessions</div>
      </div>
    );
  }

  return (
    <div className="tgrid">
      <div className="tgrid__controls">
        <span className="tgrid__label">
          {sessionNames.length} terminal{sessionNames.length !== 1 ? 's' : ''} live
        </span>
        <div className="tgrid__col-btns">
          {[1, 2, 3, 4].map(n => (
            <button
              key={n}
              className={`tgrid__col-btn ${cols === n ? 'tgrid__col-btn--active' : ''}`}
              onClick={() => setCols(n)}
              title={`${n} column${n > 1 ? 's' : ''}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div
        className="tgrid__grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {sessionNames.map(session => {
          const data = captures[session];
          const agentId = sessionToAgentId(session);
          const agent = agentMap[session] || agentMap[agentId] || null;
          const flash = changedIds.has(agentId) || (agent && changedIds.has(agent.id));
          return (
            <TerminalPane
              key={session}
              session={session}
              output={data?.output || ''}
              agent={agent}
              onSelect={onSelectAgent}
              onFullscreen={onFullscreenAgent}
              flash={flash}
            />
          );
        })}
      </div>
    </div>
  );
}
