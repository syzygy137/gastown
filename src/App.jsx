import React, { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import TownOverview from './components/TownOverview.jsx';
import AgentCards from './components/AgentCards.jsx';
import MailFeed from './components/MailFeed.jsx';
import IssueBoard from './components/IssueBoard.jsx';
import EventTimeline from './components/EventTimeline.jsx';
import FormulaBrowser from './components/FormulaBrowser.jsx';
import TmuxViewer from './components/TmuxViewer.jsx';
import Controls from './components/Controls.jsx';
import MetricsBar from './components/MetricsBar.jsx';
import ActivityFeed from './components/ActivityFeed.jsx';
import AgentDetail from './components/AgentDetail.jsx';
import CommandPalette from './components/CommandPalette.jsx';

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
  { id: 'sessions', label: 'Sessions' },
  { id: 'issues', label: 'Issues' },
  { id: 'mail', label: 'Mail' },
  { id: 'events', label: 'Events' },
  { id: 'formulas', label: 'Formulas' },
  { id: 'controls', label: 'Controls' },
];

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [activeTab, setActiveTab] = useState('sessions');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const wsRef = useRef(null);
  const retryRef = useRef(null);

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

      // 1-6 — switch tabs
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 6) {
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
      case 'sessions': return state.sessions.length || null;
      case 'issues': return state.issues.length || null;
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

      {/* Live activity strip */}
      <div className="activity-strip">
        <ActivityFeed
          activity={state.activity}
          agents={state.agents}
          onSelectAgent={setSelectedAgent}
        />
      </div>

      {/* Main area: left=overview+agents, right=tabbed detail */}
      <div className="dashboard-main">
        <div className="main-left">
          <div className="panel overview-panel">
            <div className="panel-header">Town Overview</div>
            <TownOverview agents={state.agents} sessions={state.sessions} config={state.config} />
          </div>
          <div className="panel agents-panel">
            <div className="panel-header">
              Agents
              <span className="badge badge-molecule">{state.agents.length}</span>
            </div>
            <div className="panel-body agents-scroll">
              <AgentCards agents={state.agents} sessions={state.sessions} />
            </div>
          </div>
        </div>

        <div className="main-right">
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
            {activeTab === 'sessions' && <TmuxViewer sessions={state.sessions} />}
            {activeTab === 'issues' && <IssueBoard issues={state.issues} dependencies={state.dependencies} />}
            {activeTab === 'mail' && <MailFeed mail={state.mail} agents={state.agents} />}
            {activeTab === 'events' && <EventTimeline events={state.events} />}
            {activeTab === 'formulas' && <FormulaBrowser formulas={state.formulas} />}
            {activeTab === 'controls' && <Controls daemon={state.daemon} agents={state.agents} />}
          </div>
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
