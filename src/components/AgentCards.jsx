import React, { useMemo } from 'react';
import StatusBadge from './StatusBadge.jsx';
import Tooltip from './Tooltip.jsx';
import AgentAvatar from './AgentAvatar.jsx';
import XpBar, { calculateAgentXp } from './XpBar.jsx';

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
  if (SESSION_MAP[agentId]) return SESSION_MAP[agentId];
  // Dynamic polecats: gs-gastown-polecat-furiosa -> gt-gastown-furiosa
  const polecatMatch = agentId.match(/^gs-(\w+)-polecat-(.+)$/);
  if (polecatMatch) return `gt-${polecatMatch[1]}-${polecatMatch[2]}`;
  // Default: swap prefix gs- -> gt-, sl- -> gt-
  return agentId.replace(/^(gs|sl)-/, 'gt-');
}

function findSession(agentId, sessions) {
  const name = getSessionName(agentId);
  return sessions.find(s => s.name === name) || null;
}

const STATE_COLORS = {
  working: 'var(--green)',
  active: 'var(--green)',
  'in-progress': 'var(--green)',
  'in_progress': 'var(--green)',
  idle: 'var(--yellow)',
  offline: 'var(--red)',
  blocked: 'var(--red)',
  spawning: 'var(--yellow)',
};

function deriveState(agent, sessions) {
  const session = findSession(agent.id, sessions);
  const hasSession = !!session;
  const meta = parseAgentMeta(agent.description);
  const hookBead = agent.hook_bead || meta.hook_bead;

  if (!hasSession) return 'offline';
  if (hookBead && hookBead !== 'null' && hookBead !== '') return 'working';
  return 'idle';
}

const ROLE_COLORS = {
  mayor: '#c17f24',
  deacon: '#c17f24',
  refinery: '#cc6a2e',
  witness: '#4d9e8a',
  polecat: '#b5442e',
  boot: '#8a7d65',
};

const ROLE_ICONS = {
  mayor: '\u265B',
  deacon: '\uD83D\uDEE1',
  refinery: '\u2699',
  witness: '\uD83D\uDC41',
  polecat: '\uD83D\uDD27',
  boot: '\u26A1',
};

function stateColor(state) {
  return STATE_COLORS[state?.toLowerCase()] || 'var(--yellow)';
}

function AgentTooltipContent({ agent, meta, session, role, state, hookBead, lastActivity, rig }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div><span className="tooltip-label">ID: </span><span className="tooltip-value">{agent.id}</span></div>
      {session && <div><span className="tooltip-label">Session: </span><span className="tooltip-value">{session.name}</span></div>}
      {role && <div><span className="tooltip-label">Role: </span><span className="tooltip-value">{role}</span></div>}
      <div><span className="tooltip-label">State: </span><span className="tooltip-value">{state}</span></div>
      {hookBead && <div><span className="tooltip-label">Hook: </span><span className="tooltip-value">{hookBead}</span></div>}
      {rig && <div><span className="tooltip-label">Rig: </span><span className="tooltip-value">{rig}</span></div>}
      {lastActivity && <div><span className="tooltip-label">Last active: </span><span className="tooltip-value">{relativeTime(lastActivity)}</span></div>}
    </div>
  );
}

export default function AgentCards({ agents, polecats = [], sessions = [], issues = [], onSelectAgent }) {
  const allAgents = useMemo(() => {
    const agentIds = new Set(agents.map(a => a.id));
    const merged = [...agents];
    for (const pc of polecats) {
      const sessionId = `gt-${pc.rig}-${pc.name}`;
      if (!agentIds.has(sessionId) && !agentIds.has(`${pc.rig}-${pc.name}`)) {
        merged.push({
          id: sessionId, title: pc.name, role_type: 'polecat',
          agent_state: pc.state || 'idle', hook_bead: '', status: 'open',
          description: '', rig: pc.rig, created_at: '', updated_at: '',
          _fromPolecat: true, _sessionRunning: pc.session_running,
        });
      }
    }
    return merged;
  }, [agents, polecats]);

  if (!allAgents.length) return <div className="empty">No agents found</div>;

  return (
    <div className="agent-grid-v2">
      {allAgents.map(a => {
        const meta = parseAgentMeta(a.description);
        const role = a.role_type || meta.role_type || '';
        const state = deriveState(a, sessions);
        const shortTitle = (a.title || a.id).split(' - ')[0].split(' (')[0];
        const hookBead = meta.hook_bead || a.hook_bead || null;
        const lastActivity = meta.last_activity || a.last_activity || a.updated_at || null;
        const rig = a._fromPolecat ? a.rig : (meta.rig && meta.rig !== 'null' ? meta.rig : null);
        const session = findSession(a.id, sessions);
        const hasSession = a._sessionRunning || !!session;
        const roleColor = ROLE_COLORS[role?.toLowerCase()] || stateColor(state);
        const roleLower = role?.toLowerCase() || '';
        const isActive = state === 'active' || state === 'in-progress' || state === 'in_progress' || state === 'working';
        const isWorkingPolecat = roleLower === 'polecat' && isActive;
        const xp = calculateAgentXp(a, issues);

        return (
          <Tooltip
            key={a.id}
            content={
              <AgentTooltipContent
                agent={a} meta={meta} session={session}
                role={role} state={state} hookBead={hookBead}
                lastActivity={lastActivity} rig={rig}
              />
            }
          >
            <div
              className={`agent-card-v2 agent-card-v2--${state?.toLowerCase() || 'idle'}${hasSession ? ' agent-card-v2--clickable' : ''}${isWorkingPolecat ? ' agent-card-v2--barber-pole' : ''}`}
              style={{ borderLeftColor: roleColor }}
              onClick={() => hasSession && onSelectAgent?.(getSessionName(a.id))}
            >
              <div className="agent-card-v2__header">
                <div className="agent-card-v2__header-left">
                  <AgentAvatar role={role} active={isActive} size={24} />
                  <div className="agent-card-v2__name">{shortTitle}</div>
                </div>
                <span
                  className={`role-icon role-icon--${roleLower || 'boot'}${isActive ? ' role-icon--active' : ''}`}
                  title={`${role || 'agent'}${hasSession ? ' (live)' : ' (no session)'}`}
                >
                  {ROLE_ICONS[roleLower] || '\u2699'}
                </span>
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
                    <span className="agent-card-v2__session-icon" title={session?.attached ? 'Attached' : 'Detached'}>
                      &#9618;{session?.attached ? '+' : ''}
                    </span>
                  )}
                  {relativeTime(lastActivity)}
                </span>
              </div>

              <XpBar xp={xp} compact={false} />
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}
