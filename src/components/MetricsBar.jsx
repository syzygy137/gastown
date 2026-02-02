import React, { useMemo } from 'react';

export default function MetricsBar({ agents, issues, counts, mail, daemon }) {
  const metrics = useMemo(() => {
    const totalAgents = agents.length;
    const activePolecats = agents.filter(a => {
      const role = (a.role_type || '').toLowerCase();
      const state = (a.agent_state || '').toLowerCase();
      return role === 'polecat' && a.status === 'open';
    }).length;

    // Derive from counts array (pre-aggregated by status)
    const countMap = {};
    for (const c of counts) countMap[c.status] = c.count;
    const pending = countMap['open'] || 0;
    const inProgress = (countMap['in_progress'] || 0) + (countMap['in-progress'] || 0) + (countMap['hooked'] || 0);

    // Merge queue: issues of type merge-request that are open
    const mergeQueue = issues.filter(
      i => i.issue_type === 'merge-request' && (i.status === 'open' || i.status === 'in_progress')
    ).length;

    const mailCount = mail.length;

    // Health: based on open (alive) agents vs closed ones
    let health = 'neutral';
    if (totalAgents > 0) {
      const aliveCount = agents.filter(a => a.status === 'open').length;
      const ratio = aliveCount / totalAgents;
      health = ratio > 0.5 ? 'good' : ratio > 0 ? 'warn' : 'idle';
    }

    return { totalAgents, activePolecats, pending, inProgress, mergeQueue, mailCount, health };
  }, [agents, issues, counts, mail]);

  return (
    <div className="metrics-bar">
      <div className="metric-card">
        <div className="metric-number" style={{ color: 'var(--cyan)' }}>
          {metrics.totalAgents}
          <span className={`health-dot health-${metrics.health}`} />
        </div>
        <div className="metric-label">Agents</div>
      </div>

      <div className="metric-card">
        <div className="metric-number" style={{ color: 'var(--green)' }}>
          {metrics.activePolecats}
        </div>
        <div className="metric-label">Active Polecats</div>
      </div>

      <div className="metric-card">
        <div className="metric-number" style={{ color: 'var(--yellow)' }}>
          {metrics.pending}
        </div>
        <div className="metric-label">Pending</div>
      </div>

      <div className="metric-card">
        <div className="metric-number" style={{ color: 'var(--accent)' }}>
          {metrics.inProgress}
        </div>
        <div className="metric-label">In Progress</div>
      </div>

      <div className="metric-card">
        <div className="metric-number" style={{ color: 'var(--purple)' }}>
          {metrics.mergeQueue}
        </div>
        <div className="metric-label">Merge Queue</div>
      </div>

      <div className="metric-card">
        <div className="metric-number" style={{ color: 'var(--orange)' }}>
          {metrics.mailCount}
        </div>
        <div className="metric-label">Mail</div>
      </div>

      <div className="metric-card">
        <div className={`daemon-light ${daemon.running ? 'running' : 'stopped'}`} />
        <div className="metric-label">Daemon</div>
      </div>
    </div>
  );
}
