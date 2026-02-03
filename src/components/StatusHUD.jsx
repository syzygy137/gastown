import React from 'react';
import './StatusHUD.css';

export default function StatusHUD({ agents = [], mailCount = 0, mailLatest = '', health = 'green' }) {
  const totalAgents = agents.length;
  const activePolecats = agents.filter(a => {
    const role = (a.role_type || '').toLowerCase();
    return role === 'polecat' && (a.status === 'open');
  }).length;

  const healthLabel = health === 'green' ? 'Healthy' : health === 'yellow' ? 'Degraded' : 'Critical';

  return (
    <div className="status-hud">
      {/* Top-left: town name + mayor status */}
      <div className="status-hud__cell status-hud__tl">
        <span className="status-hud__label">Gas Town</span>{' '}
        <span className="status-hud__dim">
          {agents.find(a => (a.role_type || '').toLowerCase() === 'mayor')
            ? 'Mayor online'
            : 'Mayor offline'}
        </span>
      </div>

      {/* Top-right: agent count (active/total polecats) */}
      <div className="status-hud__cell status-hud__tr">
        <span className="status-hud__label">{activePolecats}/{totalAgents}</span>{' '}
        <span className="status-hud__dim">polecats/agents</span>
      </div>

      {/* Bottom-left: unread mail count + latest mail subject */}
      <div className="status-hud__cell status-hud__bl">
        <span className="status-hud__label">{mailCount}</span>{' '}
        <span className="status-hud__dim">mail</span>
        {mailLatest && (
          <span className="status-hud__mail-subject" title={mailLatest}>
            {mailLatest}
          </span>
        )}
      </div>

      {/* Bottom-right: system health dot */}
      <div className="status-hud__cell status-hud__br">
        <span className={`status-hud__health-dot status-hud__health-dot--${health}`} />
        <span className="status-hud__dim">{healthLabel}</span>
      </div>
    </div>
  );
}
