import React from 'react';
import StatusBadge from './StatusBadge.jsx';

function parseAgentMeta(desc) {
  if (!desc) return {};
  const meta = {};
  for (const line of desc.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  return meta;
}

function relativeTime(isoString) {
  if (!isoString) return null;
  const now = Date.now();
  const then = new Date(isoString).getTime();
  if (isNaN(then)) return null;
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const SESSION_MAP = {
  'hq-mayor': 'hq-mayor',
  'hq-deacon': 'hq-deacon',
  'sl-slop-witness': 'gt-slop-witness',
  'sl-slop-refinery': 'gt-slop-refinery',
  'gs-gastown-witness': 'gt-gastown-witness',
  'gs-gastown-refinery': 'gt-gastown-refinery',
};

function getSessionName(agentId) {
  return SESSION_MAP[agentId] || agentId;
}

function findSession(agentId, sessions) {
  const name = getSessionName(agentId);
  return sessions.find(s => s.name === name) || null;
}

const STATE_COLORS = {
  active: 'var(--green)',
  'in-progress': 'var(--green)',
  'in_progress': 'var(--green)',
  idle: 'var(--yellow)',
  blocked: 'var(--red)',
};

const ROLE_COLORS = {
  mayor: '#c17f24',
  deacon: '#c17f24',
  refinery: '#cc6a2e',
  witness: '#4d9e8a',
  polecat: '#b5442e',
  boot: '#8a7d65',
};

function stateColor(state) {
  return STATE_COLORS[state?.toLowerCase()] || 'var(--yellow)';
}

export default function AgentCards({ agents, sessions = [], onSelectAgent }) {
  if (!agents.length) return <div className="empty">No agents found</div>;

  return (
    <div className="agent-grid-v2">
      {agents.map(a => {
        const meta = parseAgentMeta(a.description);
        const role = a.role_type || meta.role_type || '';
        const state = a.agent_state || meta.agent_state || 'idle';
        const shortTitle = (a.title || a.id).split(' - ')[0].split(' (')[0];
        const hookBead = meta.hook_bead || a.hook_bead || null;
        const lastActivity = meta.last_activity || a.last_activity || a.updated_at || null;
        const rig = meta.rig && meta.rig !== 'null' ? meta.rig : null;
        const session = findSession(a.id, sessions);
        const hasSession = !!session;
        const roleColor = ROLE_COLORS[role?.toLowerCase()] || stateColor(state);

        return (
          <div
            key={a.id}
            className={`agent-card-v2 agent-card-v2--${state?.toLowerCase() || 'idle'}${hasSession ? ' agent-card-v2--clickable' : ''}`}
            style={{ borderLeftColor: roleColor }}
            onClick={() => hasSession && onSelectAgent?.(getSessionName(a.id))}
          >
            <div className="agent-card-v2__header">
              <div className="agent-card-v2__name">{shortTitle}</div>
              <span
                className={`agent-card-v2__dot ${hasSession ? 'agent-card-v2__dot--live' : 'agent-card-v2__dot--dead'}`}
                title={hasSession ? 'Session running' : 'No session'}
              />
            </div>

            <div className="agent-card-v2__badges">
              {role && <StatusBadge value={role} />}
              <StatusBadge value={state} />
            </div>

            {rig && (
              <div className="agent-card-v2__rig">
                Rig: {rig}
              </div>
            )}

            {hookBead && (
              <div className="agent-card-v2__hook">
                Working on: {hookBead}
              </div>
            )}

            <div className="agent-card-v2__footer">
              <span className="agent-card-v2__id">{a.id}</span>
              <span className="agent-card-v2__activity">
                {hasSession && (
                  <span className="agent-card-v2__session-icon" title={session.attached ? 'Attached' : 'Detached'}>
                    &#9618;{session.attached ? '+' : ''}
                  </span>
                )}
                {relativeTime(lastActivity)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
