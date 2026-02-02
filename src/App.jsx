import React, { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import TownOverview from './components/TownOverview.jsx';
import AgentCards from './components/AgentCards.jsx';
import MailFeed from './components/MailFeed.jsx';
import IssueBoard from './components/IssueBoard.jsx';
import EventTimeline from './components/EventTimeline.jsx';
import FormulaBrowser from './components/FormulaBrowser.jsx';
import TmuxViewer from './components/TmuxViewer.jsx';
import Controls from './components/Controls.jsx';
import MergeQueue from './components/MergeQueue.jsx';
import MetricsBar from './components/MetricsBar.jsx';
import AgentDetail from './components/AgentDetail.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import WorkTracker from './components/WorkTracker.jsx';
import { useToast } from './components/Toast.jsx';
import LiveTerminals from './components/LiveTerminals.jsx';

const initial = {
  connected: false,
  issues: [],
  agents: [],
  mail: [],
  events: [],
  labels: [],
  dependencies: [],
  counts: [],
  sessions: [],
  activity: [],
  git: { branches: [], worktrees: [] },
  daemon: { running: false, output: '' },
  terminals: {},
  formulas: [],
  config: {},
};

function reducer(state, action) {
  switch (action.type) {
    case 'connected': return { ...state, connected: true };
    case 'disconnected': return { ...state, connected: false };
    case 'snapshot': return {
      ...state,
      issues: action.issues || state.issues,
      agents: action.agents || state.agents,
      mail: action.mail || state.mail,
      events: action.events || state.events,
      labels: action.labels || state.labels,
      dependencies: action.dependencies || state.dependencies,
      counts: action.counts || state.counts,
      sessions: action.sessions || state.sessions,
    };
    case 'tmux': return { ...state, sessions: action.sessions || state.sessions };
    case 'git': return { ...state, git: { branches: action.branches || [], worktrees: action.worktrees || [] } };
    case 'daemon': return { ...state, daemon: { running: action.running, output: action.output } };
    case 'activity': return { ...state, activity: action.agents || state.activity };
    case 'terminals': {
      const merged = { ...state.terminals };
      for (const [name, data] of Object.entries(action.sessions)) {
        merged[name] = data;
      }
      return { ...state, terminals: merged };
    }
    case 'formulas': return { ...state, formulas: action.formulas };
    case 'config': return { ...state, config: action.config };
    default: return state;
  }
}

const TABS = [
  { id: 'work', label: 'Work' },
  { id: 'agents', label: 'Agents' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'issues', label: 'Issues' },
  { id: 'merge-queue', label: 'Merge Queue' },
  { id: 'mail', label: 'Mail' },
  { id: 'events', label: 'Events' },
  { id: 'formulas', label: 'Formulas' },
  { id: 'controls', label: 'Controls' },
  { id: 'overview', label: 'Map' },
];

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [activeTab, setActiveTab] = useState('work');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const wsRef = useRef(null);
  const retryRef = useRef(null);
  const addToast = useToast();

  // Track previous state for change detection
  const prevRef = useRef({ mailIds: new Set(), agentStates: {}, issueStates: {} });

  // Fire toasts on state changes
  useEffect(() => {
    const prev = prevRef.current;

    // New mail detection
    if (state.mail.length > 0) {
      const prevIds = prev.mailIds;
      for (const m of state.mail) {
        const mid = m.id || `${m.from}-${m.timestamp}`;
        if (prevIds.size > 0 && !prevIds.has(mid)) {
          addToast({
            variant: 'mail',
            title: `Mail from ${m.from || 'unknown'}`,
            message: m.subject || m.description?.slice(0, 60) || '',
            duration: 5000,
          });
          break; // one toast per batch
        }
      }
      prev.mailIds = new Set(state.mail.map(m => m.id || `${m.from}-${m.timestamp}`));
    }

    // Agent state changes
    if (state.agents.length > 0) {
      const prevStates = prev.agentStates;
      for (const a of state.agents) {
        const name = a.name || a.id;
        const st = a.state || a.status || 'idle';
        if (prevStates[name] && prevStates[name] !== st) {
          addToast({
            variant: 'state',
            title: `${name} \u2192 ${st}`,
            message: a.hook || a.bead || '',
            duration: 4000,
          });
        }
        prevStates[name] = st;
      }
      prev.agentStates = prevStates;
    }

    // Issue completion (closed/done)
    if (state.issues.length > 0) {
      const prevIssues = prev.issueStates;
      for (const iss of state.issues) {
        const iid = iss.id || iss.key;
        const st = (iss.state || iss.status || '').toLowerCase();
        if (prevIssues[iid] && prevIssues[iid] !== st && (st === 'closed' || st === 'done')) {
          addToast({
            variant: 'success',
            title: 'Work completed',
            message: iss.title || iss.subject || iid,
            duration: 5000,
          });
        }
        prevIssues[iid] = st;
      }
      prev.issueStates = prevIssues;
    }
  }, [state.mail, state.agents, state.issues, addToast]);

  const connect = useCallback(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    wsRef.current = ws;
    ws.onopen = () => dispatch({ type: 'connected' });
    ws.onclose = () => {
      dispatch({ type: 'disconnected' });
      retryRef.current = setTimeout(connect, 3000);
    };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        dispatch(data);
      } catch { /* ignore bad messages */ }
    };
  }, []);

  useEffect(() => {
    connect();
    fetch('/api/formulas').then(r => r.json()).then(f => dispatch({ type: 'formulas', formulas: f })).catch(() => {});
    fetch('/api/config').then(r => r.json()).then(c => dispatch({ type: 'config', config: c })).catch(() => {});
    return () => {
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleGlobalKey(e) {
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

      // Ctrl+K / Cmd+K — always opens palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
        return;
      }

      // Escape — close palette or agent detail
      if (e.key === 'Escape') {
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (selectedAgent) { setSelectedAgent(null); return; }
        return;
      }

      // Skip remaining shortcuts when typing in inputs or palette is open
      if (isInput || paletteOpen) return;

      // 1-7 — switch tabs
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= TABS.length) {
        e.preventDefault();
        setActiveTab(TABS[num - 1].id);
        return;
      }

      // / — focus command input in Controls tab
      if (e.key === '/') {
        e.preventDefault();
        setActiveTab('controls');
        setTimeout(() => {
          const cmdInput = document.querySelector('.cmd-input');
          if (cmdInput) cmdInput.focus();
        }, 100);
        return;
      }

      // r — refresh
      if (e.key === 'r') {
        e.preventDefault();
        window.location.reload();
        return;
      }
    }

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [paletteOpen, selectedAgent]);

  const tabBadge = (id) => {
    switch (id) {
      case 'work': {
        const active = state.agents.filter(a => a.hook_bead).length;
        return active || null;
      }
      case 'agents': return state.agents.length || null;
      case 'sessions': return state.sessions.length || null;
      case 'issues': return state.issues.length || null;
      case 'merge-queue': {
        const active = state.issues.filter(i =>
          (i.issue_type === 'merge-request' || i.issue_type === 'merge_request') &&
          i.status !== 'closed' && i.status !== 'done'
        ).length;
        return active || null;
      }
      case 'mail': return state.mail.length || null;
      case 'events': return state.events.length || null;
      case 'formulas': return state.formulas.length || null;
      default: return null;
    }
  };

  return (
    <div className="dashboard-viewport">
      {/* Top bar: header + metrics */}
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <h1>{'\u2699'} Gas Town</h1>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            Command & Control
          </span>
        </div>
        <MetricsBar
          agents={state.agents}
          issues={state.issues}
          counts={state.counts}
          mail={state.mail}
          daemon={state.daemon}
        />
        <button className="palette-trigger" onClick={() => setPaletteOpen(true)}>
          {'\u2315'} Search
          <kbd className="cmd-palette-kbd">{'\u2318'}K</kbd>
        </button>
        <div className="conn-status">
          <span className={`conn-dot ${state.connected ? 'connected' : 'disconnected'}`} />
          {state.connected ? 'Live' : 'Reconnecting...'}
        </div>
      </header>

      {/* Primary view: live terminal grid */}
      <div className="live-terminals-area">
        <LiveTerminals agents={state.agents} onSelectAgent={setSelectedAgent} />
      </div>

      {/* Bottom panel: tabbed detail views */}
      <div className="dashboard-bottom">
        <div className="tab-bar">
          {TABS.map((t, idx) => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
              <span className="tab-shortcut">{idx + 1}</span>
              {tabBadge(t.id) != null && (
                <span className="tab-badge">{tabBadge(t.id)}</span>
              )}
            </button>
          ))}
        </div>
        <div className="tab-content">
          {activeTab === 'work' && <WorkTracker issues={state.issues} agents={state.agents} />}
          {activeTab === 'agents' && <AgentCards agents={state.agents} sessions={state.sessions} onSelectAgent={setSelectedAgent} />}
          {activeTab === 'sessions' && <TmuxViewer sessions={state.sessions} />}
          {activeTab === 'issues' && <IssueBoard issues={state.issues} dependencies={state.dependencies} />}
          {activeTab === 'merge-queue' && <MergeQueue issues={state.issues} events={state.events} />}
          {activeTab === 'mail' && <MailFeed mail={state.mail} agents={state.agents} />}
          {activeTab === 'events' && <EventTimeline events={state.events} />}
          {activeTab === 'formulas' && <FormulaBrowser formulas={state.formulas} />}
          {activeTab === 'controls' && <Controls daemon={state.daemon} agents={state.agents} />}
          {activeTab === 'overview' && <TownOverview agents={state.agents} sessions={state.sessions} config={state.config} />}
        </div>
      </div>

      {/* Agent detail modal */}
      {selectedAgent && (
        <AgentDetail
          session={selectedAgent}
          agents={state.agents}
          onClose={() => setSelectedAgent(null)}
        />
      )}

      {/* Command palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        agents={state.agents}
        issues={state.issues}
        onSwitchTab={setActiveTab}
        onSelectAgent={(agent) => {
          const session = agent.title || agent.id;
          setSelectedAgent(session);
        }}
      />
    </div>
  );
}
