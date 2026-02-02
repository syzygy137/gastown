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
import AchievementToast, { useAchievements } from './components/AchievementToast.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';

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
  polecats: [],
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
      polecats: action.polecats || state.polecats,
    };
    case 'tmux': return { ...state, sessions: action.sessions || state.sessions };
    case 'git': return { ...state, git: { branches: action.branches || [], worktrees: action.worktrees || [] } };
    case 'daemon': return { ...state, daemon: { running: action.running, output: action.output } };
    case 'polecats': return { ...state, polecats: action.list || state.polecats };
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

// Convert agent path name (gastown/witness) to session name (gt-gastown-witness)
function agentPathToSession(name) {
  if (!name) return null;
  const parts = name.split('/');
  if (parts.length === 2) {
    const [town, role] = parts;
    if (town === 'gastown') return `gt-gastown-${role}`;
    if (town === 'slop') return `gt-slop-${role}`;
    return `${town}-${role}`;
  }
  return name;
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [activeTab, setActiveTab] = useState('work');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState([]); // [{label, action}]
  const [focusIssueId, setFocusIssueId] = useState(null);
  const [terminalsCollapsed, setTerminalsCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  const wsRef = useRef(null);
  const retryRef = useRef(null);
  const addToast = useToast();
  const { toasts, checkAchievements, dismissToast } = useAchievements();

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

  useEffect(() => {
    checkAchievements(state);
  }, [state.issues, state.agents, state.mail, checkAchievements]);

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

  // Drill-down: open issue detail (switch to Issues tab and expand)
  const drillIssue = useCallback((issueId) => {
    setBreadcrumbs(prev => [...prev, { label: `Issue ${issueId}`, tab: activeTab }]);
    setActiveTab('issues');
    setFocusIssueId(issueId);
  }, [activeTab]);

  // Drill-down: open agent detail
  const drillAgent = useCallback((agentNameOrSession) => {
    // Try to resolve to a session name
    let session = agentNameOrSession;
    if (agentNameOrSession.includes('/')) {
      session = agentPathToSession(agentNameOrSession);
    }
    setBreadcrumbs(prev => [...prev, { label: agentNameOrSession, tab: activeTab }]);
    setSelectedAgent(session);
  }, [activeTab]);

  // Drill-down: click metric to switch tab
  const drillMetric = useCallback((metricTab) => {
    setBreadcrumbs(prev => [...prev, { label: metricTab, tab: activeTab }]);
    setActiveTab(metricTab);
  }, [activeTab]);

  // Breadcrumb: go back
  const breadcrumbBack = useCallback(() => {
    setBreadcrumbs(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.tab) setActiveTab(last.tab);
      setSelectedAgent(null);
      setFocusIssueId(null);
      return prev.slice(0, -1);
    });
  }, []);

  const clearBreadcrumbs = useCallback(() => {
    setBreadcrumbs([]);
    setFocusIssueId(null);
  }, []);

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

      // Escape — close palette, agent detail, or breadcrumbs
      if (e.key === 'Escape') {
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (selectedAgent) { setSelectedAgent(null); return; }
        if (breadcrumbs.length > 0) { breadcrumbBack(); return; }
        return;
      }

      // Skip remaining shortcuts when typing in inputs or palette is open
      if (isInput || paletteOpen) return;

      // 1-7 — switch tabs
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= TABS.length) {
        e.preventDefault();
        setActiveTab(TABS[num - 1].id);
        clearBreadcrumbs();
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
  }, [paletteOpen, selectedAgent, breadcrumbs, breadcrumbBack, clearBreadcrumbs]);

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

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    clearBreadcrumbs();
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
          polecats={state.polecats}
          issues={state.issues}
          counts={state.counts}
          mail={state.mail}
          daemon={state.daemon}
          sessions={state.sessions}
          onClickMetric={drillMetric}
        />
        <button className="palette-trigger" onClick={() => setPaletteOpen(true)}>
          {'\u2315'} Search
          <kbd className="cmd-palette-kbd">{'\u2318'}K</kbd>
        </button>
        <ThemeToggle />
        <div className="conn-status">
          <span className={`conn-dot ${state.connected ? 'connected' : 'disconnected'}`} />
          {state.connected ? 'Live' : 'Reconnecting...'}
        </div>
      </header>

      {/* Breadcrumb context bar — only when drilled in */}
      {breadcrumbs.length > 0 && (
        <div className="breadcrumb-bar">
          <button className="breadcrumb-back" onClick={breadcrumbBack}>{'\u2190'} Back</button>
          <span className="breadcrumb-path">
            Viewing: {breadcrumbs.map((b, i) => (
              <span key={i}>
                {i > 0 && <span className="breadcrumb-sep">{'\u203A'}</span>}
                {b.label}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* Primary view: live terminal grid */}
      <div className={`live-terminals-area ${terminalsCollapsed ? 'panel-collapsed' : ''}`}>
        <button
          className="panel-collapse-toggle"
          onClick={() => setTerminalsCollapsed(c => !c)}
          aria-label={terminalsCollapsed ? 'Expand terminals' : 'Collapse terminals'}
        >
          <span className="panel-collapse-label">Terminals</span>
          <span className="panel-collapse-icon">{terminalsCollapsed ? '\u25BC' : '\u25B2'}</span>
        </button>
        {!terminalsCollapsed && (
          <LiveTerminals agents={state.agents} onSelectAgent={setSelectedAgent} />
        )}
      </div>

      {/* Bottom panel: tabbed detail views */}
      <div className={`dashboard-bottom ${bottomCollapsed ? 'panel-collapsed' : ''}`}>
        <button
          className="panel-collapse-toggle"
          onClick={() => setBottomCollapsed(c => !c)}
          aria-label={bottomCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          <span className="panel-collapse-label">Details</span>
          <span className="panel-collapse-icon">{bottomCollapsed ? '\u25BC' : '\u25B2'}</span>
        </button>
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
        <div className="tab-content" key={activeTab}>
          {activeTab === 'work' && (
            <WorkTracker
              issues={state.issues}
              agents={state.agents}
              onDrillIssue={drillIssue}
              onDrillAgent={drillAgent}
            />
          )}
          {activeTab === 'agents' && <AgentCards agents={state.agents} polecats={state.polecats} sessions={state.sessions} issues={state.issues} onSelectAgent={setSelectedAgent} />}
          {activeTab === 'sessions' && <TmuxViewer sessions={state.sessions} />}
          {activeTab === 'issues' && (
            <IssueBoard
              issues={state.issues}
              dependencies={state.dependencies}
              agents={state.agents}
              polecats={state.polecats}
              focusIssueId={focusIssueId}
              onClearFocus={() => setFocusIssueId(null)}
              onDrillAgent={drillAgent}
              onDrillIssue={drillIssue}
            />
          )}
          {activeTab === 'merge-queue' && <MergeQueue issues={state.issues} events={state.events} />}
          {activeTab === 'mail' && (
            <MailFeed
              mail={state.mail}
              agents={state.agents}
              onDrillAgent={drillAgent}
              onDrillIssue={drillIssue}
            />
          )}
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

      {/* Achievement toasts */}
      <AchievementToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
