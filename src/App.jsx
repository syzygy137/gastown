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

const initial = {
  connected: false,
  issues: [],
  agents: [],
  mail: [],
  events: [],
  labels: [],
  counts: [],
  sessions: [],
  git: { branches: [], worktrees: [] },
  daemon: { running: false, output: '' },
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
      counts: action.counts || state.counts,
      sessions: action.sessions || state.sessions,
    };
    case 'tmux': return { ...state, sessions: action.sessions || state.sessions };
    case 'git': return { ...state, git: { branches: action.branches || [], worktrees: action.worktrees || [] } };
    case 'daemon': return { ...state, daemon: { running: action.running, output: action.output } };
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
        <div className="conn-status">
          <span className={`conn-dot ${state.connected ? 'connected' : 'disconnected'}`} />
          {state.connected ? 'Live' : 'Reconnecting...'}
        </div>
      </header>

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
            {TABS.map(t => (
              <button
                key={t.id}
                className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
                {tabBadge(t.id) != null && (
                  <span className="tab-badge">{tabBadge(t.id)}</span>
                )}
              </button>
            ))}
          </div>
          <div className="tab-content">
            {activeTab === 'sessions' && <TmuxViewer sessions={state.sessions} />}
            {activeTab === 'issues' && <IssueBoard issues={state.issues} />}
            {activeTab === 'mail' && <MailFeed mail={state.mail} agents={state.agents} />}
            {activeTab === 'events' && <EventTimeline events={state.events} />}
            {activeTab === 'formulas' && <FormulaBrowser formulas={state.formulas} />}
            {activeTab === 'controls' && <Controls daemon={state.daemon} agents={state.agents} />}
          </div>
        </div>
      </div>
    </div>
  );
}
