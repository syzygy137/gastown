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

const initial = {
  connected: false,
  issues: [],
  agents: [],
  mail: [],
  events: [],
  labels: [],
  counts: [],
  sessions: [],
  activity: [],
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
    case 'activity': return { ...state, activity: action.agents || state.activity };
    case 'formulas': return { ...state, formulas: action.formulas };
    case 'config': return { ...state, config: action.config };
    default: return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [selectedAgent, setSelectedAgent] = useState(null);
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
    // Fetch formulas and config (one-time)
    fetch('/api/formulas').then(r => r.json()).then(f => dispatch({ type: 'formulas', formulas: f })).catch(() => {});
    fetch('/api/config').then(r => r.json()).then(c => dispatch({ type: 'config', config: c })).catch(() => {});
    return () => {
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Gas Town — {state.config?.town?.name || 'gt'}</h1>
        <div className="conn-status">
          <span className={`conn-dot ${state.connected ? 'connected' : 'disconnected'}`} />
          {state.connected ? 'Live' : 'Reconnecting...'}
        </div>
      </header>

      <MetricsBar
        agents={state.agents}
        issues={state.issues}
        counts={state.counts}
        mail={state.mail}
        daemon={state.daemon}
      />

      <div className="activity-panel panel">
        <div className="panel-header">
          Live Activity
          <span className="badge badge-active">{state.activity.filter(a => a.status === 'active').length} active</span>
        </div>
        <div className="panel-body">
          <ActivityFeed
            activity={state.activity}
            agents={state.agents}
            onSelectAgent={setSelectedAgent}
          />
        </div>
      </div>

      {selectedAgent && (
        <AgentDetail
          session={selectedAgent}
          agents={state.agents}
          onClose={() => setSelectedAgent(null)}
        />
      )}

      <div className="town-overview panel">
        <div className="panel-header">Town Overview</div>
        <TownOverview agents={state.agents} sessions={state.sessions} config={state.config} />
      </div>

      <div className="controls panel">
        <div className="panel-header">Controls</div>
        <div className="panel-body">
          <Controls daemon={state.daemon} agents={state.agents} />
        </div>
      </div>

      <div className="row-2">
        <div className="panel">
          <div className="panel-header">
            Agents
            <span className="badge badge-molecule">{state.agents.length}</span>
          </div>
          <div className="panel-body scroll-area">
            <AgentCards agents={state.agents} sessions={state.sessions} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">Issue Board</div>
          <div className="panel-body">
            <IssueBoard issues={state.issues} />
          </div>
        </div>
      </div>

      <div className="row-3">
        <div className="panel">
          <div className="panel-header">
            Mail
            <span className="badge badge-message">{state.mail.length}</span>
          </div>
          <div className="panel-body scroll-area">
            <MailFeed mail={state.mail} agents={state.agents} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            Events
            <span className="badge badge-idle">{state.events.length}</span>
          </div>
          <div className="panel-body scroll-area">
            <EventTimeline events={state.events} />
          </div>
        </div>
      </div>

      <div className="row-4">
        <div className="panel">
          <div className="panel-header">
            Formulas
            <span className="badge badge-idle">{state.formulas.length}</span>
          </div>
          <div className="panel-body scroll-area">
            <FormulaBrowser formulas={state.formulas} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">Tmux Sessions</div>
          <TmuxViewer sessions={state.sessions} />
        </div>
      </div>
    </div>
  );
}
