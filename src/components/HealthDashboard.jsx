import React, { useMemo } from 'react';

const SESSION_MAP = {
  'hq-mayor': 'hq-mayor',
  'hq-deacon': 'hq-deacon',
  'sl-slop-witness': 'gt-slop-witness',
  'sl-slop-refinery': 'gt-slop-refinery',
  'gs-gastown-witness': 'gt-gastown-witness',
  'gs-gastown-refinery': 'gt-gastown-refinery',
};

function parseAgentMeta(desc) {
  if (!desc) return {};
  const meta = {};
  for (const line of desc.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  return meta;
}

function findSession(agentId, sessions) {
  const name = SESSION_MAP[agentId] || agentId;
  return sessions.find(s => s.name === name) || null;
}

function deriveState(agent, sessions) {
  const session = findSession(agent.id, sessions);
  if (!session) return 'offline';
  const meta = parseAgentMeta(agent.description);
  const hookBead = agent.hook_bead || meta.hook_bead;
  if (hookBead && hookBead !== 'null' && hookBead !== '') return 'working';
  return 'idle';
}

function formatUptime(daemon) {
  if (!daemon || !daemon.running) return 'Down';
  if (daemon.uptime) return daemon.uptime;
  if (daemon.started_at || daemon.startedAt) {
    const start = new Date(daemon.started_at || daemon.startedAt).getTime();
    const diff = Date.now() - start;
    if (isNaN(diff) || diff < 0) return 'Running';
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  }
  return 'Running';
}

export default function HealthDashboard({ agents, sessions, issues, events, daemon, polecats }) {
  const health = useMemo(() => {
    // Agent health: count agents with active sessions (not offline)
    const agentStates = (agents || []).map(a => ({
      name: a.name || a.id,
      role: (a.role_type || a.role || '').toLowerCase(),
      state: deriveState(a, sessions || []),
    }));
    const healthy = agentStates.filter(a => a.state !== 'offline').length;
    const offline = agentStates.filter(a => a.state === 'offline').length;
    const working = agentStates.filter(a => a.state === 'working').length;
    const idle = agentStates.filter(a => a.state === 'idle').length;

    // Merge success rate
    const mergeRequests = (issues || []).filter(i =>
      i.issue_type === 'merge-request' || i.issue_type === 'merge_request'
    );
    const merged = mergeRequests.filter(mr => mr.status === 'closed' || mr.status === 'done').length;
    const totalMR = mergeRequests.length;
    const mergeRate = totalMR > 0 ? Math.round((merged / totalMR) * 100) : 0;

    // Session count
    const sessionCount = (sessions || []).length;

    // Error count from events
    const errorEvents = (events || []).filter(ev => {
      const t = (ev.event_type || '').toLowerCase();
      const c = (ev.comment || '').toLowerCase();
      return t === 'error' || t === 'failure' || c.includes('error') || c.includes('fail');
    });
    const errorCount = errorEvents.length;

    // Daemon uptime
    const uptime = formatUptime(daemon);
    const daemonUp = daemon && daemon.running;

    return {
      agentStates,
      healthy, offline, working, idle,
      totalAgents: (agents || []).length,
      mergeRate, merged, totalMR,
      sessionCount,
      errorCount, errorEvents: errorEvents.slice(0, 10),
      uptime, daemonUp,
      polecatCount: (polecats || []).length,
    };
  }, [agents, sessions, issues, events, daemon, polecats]);

  const overallStatus = health.daemonUp && health.healthy > 0 && health.errorCount === 0
    ? 'good'
    : health.daemonUp && health.healthy > 0
      ? 'warn'
      : 'critical';

  return (
    <div className="health-dashboard">
      {/* Overall status banner */}
      <div className={`health-banner health-banner--${overallStatus}`}>
        <span className={`health-banner-dot health-banner-dot--${overallStatus}`} />
        <span className="health-banner-text">
          {overallStatus === 'good' ? 'All Systems Operational' :
           overallStatus === 'warn' ? 'Degraded — Errors Detected' :
           'Systems Down'}
        </span>
      </div>

      {/* Gauge row */}
      <div className="health-gauges">
        <div className="health-gauge">
          <div className={`health-gauge-icon ${health.daemonUp ? 'gauge-up' : 'gauge-down'}`}>
            {health.daemonUp ? '\u2B24' : '\u25CB'}
          </div>
          <div className="health-gauge-value">{health.uptime}</div>
          <div className="health-gauge-label">Daemon Uptime</div>
        </div>

        <div className="health-gauge">
          <div className="health-gauge-icon gauge-agents">{'\u2666'}</div>
          <div className="health-gauge-value">
            {health.healthy}
            <span className="health-gauge-sub">/ {health.totalAgents}</span>
          </div>
          <div className="health-gauge-label">Agents Healthy</div>
        </div>

        <div className="health-gauge">
          <div className="health-gauge-icon gauge-merge">{'\u26A1'}</div>
          <div className="health-gauge-value">
            {health.mergeRate}%
            <span className="health-gauge-sub">{health.merged}/{health.totalMR}</span>
          </div>
          <div className="health-gauge-label">Merge Success</div>
        </div>

        <div className="health-gauge">
          <div className="health-gauge-icon gauge-sessions">{'\u25A0'}</div>
          <div className="health-gauge-value">{health.sessionCount}</div>
          <div className="health-gauge-label">Sessions</div>
        </div>

        <div className="health-gauge">
          <div className={`health-gauge-icon ${health.errorCount > 0 ? 'gauge-error' : 'gauge-clear'}`}>
            {'\u26A0'}
          </div>
          <div className={`health-gauge-value ${health.errorCount > 0 ? 'health-gauge-value--error' : ''}`}>
            {health.errorCount}
          </div>
          <div className="health-gauge-label">Errors</div>
        </div>
      </div>

      {/* Agent breakdown */}
      <div className="health-section">
        <div className="health-section-header">Agent Breakdown</div>
        <div className="health-agent-grid">
          <div className="health-agent-stat">
            <span className="health-stat-dot health-stat-dot--working" />
            <span className="health-stat-count">{health.working}</span>
            <span className="health-stat-label">Working</span>
          </div>
          <div className="health-agent-stat">
            <span className="health-stat-dot health-stat-dot--idle" />
            <span className="health-stat-count">{health.idle}</span>
            <span className="health-stat-label">Idle</span>
          </div>
          <div className="health-agent-stat">
            <span className="health-stat-dot health-stat-dot--offline" />
            <span className="health-stat-count">{health.offline}</span>
            <span className="health-stat-label">Offline</span>
          </div>
          <div className="health-agent-stat">
            <span className="health-stat-dot health-stat-dot--polecat" />
            <span className="health-stat-count">{health.polecatCount}</span>
            <span className="health-stat-label">Polecats</span>
          </div>
        </div>
      </div>

      {/* Recent errors */}
      {health.errorEvents.length > 0 && (
        <div className="health-section">
          <div className="health-section-header">Recent Errors</div>
          <div className="health-error-list">
            {health.errorEvents.map((ev, i) => (
              <div key={ev.id || i} className="health-error-row">
                <span className="health-error-type">{ev.event_type || 'error'}</span>
                {ev.actor && <span className="health-error-actor">{ev.actor}</span>}
                <span className="health-error-msg">{(ev.comment || '').slice(0, 100)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
