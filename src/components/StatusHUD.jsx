import React from 'react';
import './StatusHUD.css';

export default function StatusHUD({ connected = false, agents = [], issues = [], polecats = [], messages = [] }) {
  const activeAgents = agents.filter(a => a.hook_bead || a.state === 'working' || a.status === 'active').length;
  const openIssues = issues.filter(i => i.status !== 'closed' && i.status !== 'done').length;
  const activeCats = polecats.length;

  return (
    <>
      {/* Top-left: connection + agent count */}
      <div className="status-hud status-hud--top-left">
        <div className="status-hud__item">
          <span className={`status-hud__dot ${connected ? 'status-hud__dot--on' : 'status-hud__dot--off'}`} />
          <span className="status-hud__label">{connected ? 'Live' : 'Offline'}</span>
        </div>
        <div className="status-hud__item">
          <span className="status-hud__value">{activeAgents}</span>
          <span className="status-hud__label">active</span>
        </div>
      </div>

      {/* Top-right: issue + polecat counts */}
      <div className="status-hud status-hud--top-right">
        <div className="status-hud__item">
          <span className="status-hud__value">{openIssues}</span>
          <span className="status-hud__label">issues</span>
        </div>
        <div className="status-hud__item">
          <span className="status-hud__value">{activeCats}</span>
          <span className="status-hud__label">polecats</span>
        </div>
      </div>

      {/* Bottom-left: message count */}
      <div className="status-hud status-hud--bottom-left">
        <div className="status-hud__item">
          <span className="status-hud__value">{messages.length}</span>
          <span className="status-hud__label">messages</span>
        </div>
      </div>

      {/* Bottom-right: label */}
      <div className="status-hud status-hud--bottom-right">
        <div className="status-hud__item">
          <span className="status-hud__label status-hud__clock">
            Gas Town
          </span>
        </div>
      </div>
    </>
  );
}
