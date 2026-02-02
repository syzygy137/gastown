import React, { useRef, useState, useEffect, useMemo } from 'react';
import StatusBadge from './StatusBadge.jsx';

function relativeTime(isoString) {
  if (!isoString) return '';
  const diff = Math.max(0, Date.now() - new Date(isoString).getTime());
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return 'now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function parseLastLine(lines) {
  if (!lines || !lines.length) return '';
  // Walk backwards to find a non-empty line
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (l) return l;
  }
  return '';
}

function agentDisplayName(session) {
  // Convert session names like gt-gastown-witness -> gastown/witness
  return session
    .replace(/^(gt|hq)-/, '')
    .replace(/-/g, '/');
}

function agentRole(session) {
  if (session.startsWith('hq-')) return 'hq';
  const parts = session.split('-');
  return parts[parts.length - 1] || 'agent';
}

function parseAgentMeta(desc) {
  if (!desc) return {};
  const meta = {};
  for (const line of desc.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  return meta;
}

function deriveActivityState(agentData, hasSession) {
  if (!hasSession) return 'offline';
  const meta = parseAgentMeta(agentData?.description);
  const hookBead = agentData?.hook_bead || meta.hook_bead;
  if (hookBead && hookBead !== 'null' && hookBead !== '') return 'working';
  return 'idle';
}

export default function ActivityFeed({ activity = [], agents = [], onSelectAgent }) {
  const scrollRef = useRef(null);
  const [hovering, setHovering] = useState(false);

  // Auto-scroll unless user is hovering
  useEffect(() => {
    if (!hovering && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activity, hovering]);

  // Merge agent metadata with activity data
  const enriched = useMemo(() => {
    const agentMap = {};
    for (const a of agents) {
      agentMap[a.id] = a;
      // Also map by common session name patterns
      // Strip polecat- segment: gs-gastown-polecat-furiosa -> gt-gastown-furiosa
      const base = a.id
        .replace(/^(gs|sl)-/, (_, p) => p === 'gs' ? 'gastown-' : 'slop-')
        .replace(/-polecat-/, '-');
      const sessionName = `gt-${base}`;
      agentMap[sessionName] = a;
    }

    return activity.map(a => {
      const agent = agentMap[a.agent] || agentMap[a.session] || null;
      const hasSession = a.status === 'running' || !!a.lastLines?.length;
      return {
        ...a,
        agentData: agent,
        displayName: agentDisplayName(a.session),
        role: agent?.role_type || agentRole(a.session),
        state: deriveActivityState(agent, hasSession),
        lastLine: parseLastLine(a.lastLines),
      };
    });
  }, [activity, agents]);

  if (!enriched.length) {
    return <div className="empty">No agent activity yet</div>;
  }

  return (
    <div
      className="activity-feed"
      ref={scrollRef}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {enriched.map((a, i) => {
        const isActive = a.state === 'working';
        const isIdle = a.state === 'idle' || a.state === 'offline';
        return (
          <div
            key={a.session}
            className={`activity-row ${isActive ? 'activity-row--active' : ''} ${isIdle ? 'activity-row--idle' : ''}`}
            onClick={() => onSelectAgent?.(a.session)}
          >
            <div className="activity-row__left">
              <div className="activity-row__name">{a.displayName}</div>
              <div className="activity-row__badges">
                <StatusBadge value={a.role} />
                {isActive && !isIdle && (
                  <span className="activity-thinking">
                    <span className="activity-thinking__dot" />
                    <span className="activity-thinking__dot" />
                    <span className="activity-thinking__dot" />
                  </span>
                )}
              </div>
            </div>
            <div className="activity-row__output">
              {isIdle ? <span className="activity-idle-label">{a.state}</span> : a.lastLine}
            </div>
            <div className="activity-row__time">{relativeTime(a.timestamp)}</div>
          </div>
        );
      })}
    </div>
  );
}
