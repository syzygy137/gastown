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

export default function AgentCards({ agents }) {
  if (!agents.length) return <div className="empty">No agents found</div>;

  return (
    <div className="agent-grid">
      {agents.map(a => {
        const meta = parseAgentMeta(a.description);
        const role = a.role_type || meta.role_type || '';
        const state = a.agent_state || meta.agent_state || 'idle';
        const shortTitle = (a.title || a.id).split(' - ')[0].split(' (')[0];

        return (
          <div key={a.id} className="agent-card">
            <div className="agent-name">
              {shortTitle}
              {' '}
              <StatusBadge value={state} />
            </div>
            <div className="agent-meta">
              {role && <span>Role: {role} </span>}
              <StatusBadge value={a.issue_type} />
              {meta.rig && meta.rig !== 'null' && <span> | Rig: {meta.rig}</span>}
            </div>
            <div className="agent-meta" style={{ marginTop: 2, fontSize: 10 }}>
              {a.id}
            </div>
          </div>
        );
      })}
    </div>
  );
}
