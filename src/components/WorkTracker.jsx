import React, { useState } from 'react';
import StatusBadge from './StatusBadge.jsx';
import Tooltip from './Tooltip.jsx';
import LinkedText from './LinkedText.jsx';
import ConvoyGraph from './ConvoyGraph.jsx';

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

function progressPercent(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

export default function WorkTracker({ issues, agents, dependencies, onDrillIssue, onDrillAgent }) {
  const [filter, setFilter] = useState('all');

  // Build convoy map: agents with active hook_beads
  const convoys = [];
  for (const agent of agents) {
    const hookBead = agent.hook_bead || '';
    if (!hookBead) continue;
    const issue = issues.find(i => i.id === hookBead);
    convoys.push({
      agent,
      hookBead,
      issue,
      state: agent.agent_state || 'idle',
    });
  }

  // Work items: all non-agent, non-message issues
  const workItems = issues.filter(i =>
    i.issue_type !== 'agent' && i.issue_type !== 'message'
  );

  // Status counts for summary
  const statusCounts = { open: 0, 'in-progress': 0, blocked: 0, closed: 0 };
  for (const item of workItems) {
    const s = (item.status || 'open').toLowerCase().replace('_', '-');
    if (s === 'in-progress' || s === 'in_progress') statusCounts['in-progress']++;
    else if (statusCounts[s] !== undefined) statusCounts[s]++;
    else statusCounts['open']++;
  }
  const total = workItems.length;
  const doneCount = statusCounts['closed'];
  const activeCount = statusCounts['in-progress'];
  const blockedCount = statusCounts['blocked'];
  const openCount = statusCounts['open'];
  const pct = progressPercent(doneCount, total);

  // Filter work items
  const filtered = filter === 'all' ? workItems : workItems.filter(i => {
    const s = (i.status || 'open').toLowerCase().replace('_', '-');
    return s === filter;
  });

  return (
    <div className="work-tracker">
      {/* Progress summary */}
      <div className="work-summary">
        <div className="work-summary__progress">
          <div className="work-summary__bar-label">
            <span>Overall Progress</span>
            <span className="work-summary__pct">{pct}%</span>
          </div>
          <div className="work-progress-bar">
            <div className="work-progress-bar__fill work-progress-bar__fill--done" style={{ width: `${progressPercent(doneCount, total)}%` }} />
            <div className="work-progress-bar__fill work-progress-bar__fill--active" style={{ width: `${progressPercent(activeCount, total)}%` }} />
            <div className="work-progress-bar__fill work-progress-bar__fill--blocked" style={{ width: `${progressPercent(blockedCount, total)}%` }} />
          </div>
        </div>
        <div className="work-summary__stats">
          <Tooltip content="Issues with status=open, ready to be worked on">
            <div className="work-stat">
              <span className="work-stat__num" style={{ color: 'var(--green)' }}>{openCount}</span>
              <span className="work-stat__label">Open</span>
            </div>
          </Tooltip>
          <Tooltip content="Issues actively being worked on by agents">
            <div className="work-stat">
              <span className="work-stat__num" style={{ color: 'var(--yellow)' }}>{activeCount}</span>
              <span className="work-stat__label">In Progress</span>
            </div>
          </Tooltip>
          <Tooltip content="Issues waiting on dependencies or external input">
            <div className="work-stat">
              <span className="work-stat__num" style={{ color: 'var(--red)' }}>{blockedCount}</span>
              <span className="work-stat__label">Blocked</span>
            </div>
          </Tooltip>
          <Tooltip content="Issues that have been completed and closed">
            <div className="work-stat">
              <span className="work-stat__num" style={{ color: 'var(--purple)' }}>{doneCount}</span>
              <span className="work-stat__label">Done</span>
            </div>
          </Tooltip>
          <Tooltip content="Total work items (excluding agent and message issues)">
            <div className="work-stat">
              <span className="work-stat__num" style={{ color: 'var(--accent)' }}>{total}</span>
              <span className="work-stat__label">Total</span>
            </div>
          </Tooltip>
        </div>
      </div>

      {/* Dependency graph */}
      <ConvoyGraph
        issues={issues}
        dependencies={dependencies}
        agents={agents}
        onDrillIssue={onDrillIssue}
      />

      {/* Active convoys */}
      {convoys.length > 0 && (
        <div className="work-convoys">
          <div className="work-section-header">
            Active Convoys
            <span className="badge badge-convoy">{convoys.length}</span>
          </div>
          <div className="work-convoy-grid">
            {convoys.map(c => {
              const tooltipContent = c.issue
                ? `${c.agent.title || c.agent.id}\nWorking on: ${c.hookBead}\n${c.issue.title || ''}\nStatus: ${c.issue.status || 'unknown'}`
                : `${c.agent.title || c.agent.id}\nHooked to: ${c.hookBead}`;
              return (
                <Tooltip key={c.agent.id} content={tooltipContent}>
                  <div
                    className={`work-convoy-card work-convoy-card--${c.state}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => c.issue && onDrillIssue?.(c.hookBead)}
                  >
                    <div className="work-convoy-card__header">
                      <span
                        className="work-convoy-card__agent cross-link cross-link--agent"
                        onClick={e => {
                          e.stopPropagation();
                          onDrillAgent?.((c.agent.title || c.agent.id).split(' - ')[0]);
                        }}
                      >
                        {(c.agent.title || c.agent.id).split(' - ')[0]}
                      </span>
                      <StatusBadge value={c.state} />
                    </div>
                    <div className="work-convoy-card__bead">
                      <span
                        className="cross-link cross-link--issue"
                        onClick={e => { e.stopPropagation(); onDrillIssue?.(c.hookBead); }}
                      >
                        {c.hookBead}
                      </span>
                    </div>
                    {c.issue && (
                      <div className="work-convoy-card__title">
                        {c.issue.title || c.issue.id}
                      </div>
                    )}
                    {c.issue && (
                      <div className="work-convoy-card__meta">
                        <StatusBadge value={c.issue.status} />
                        {c.issue.rig && <span className="work-convoy-card__rig">{c.issue.rig}</span>}
                      </div>
                    )}
                    <div className="work-convoy-card__time">
                      {relativeTime(c.agent.updated_at)}
                    </div>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}
      {convoys.length === 0 && (
        <div className="work-convoys">
          <div className="work-section-header">Active Convoys</div>
          <div className="empty">No active convoys &mdash; no agents hooked to work items</div>
        </div>
      )}

      {/* Work items list */}
      <div className="work-items">
        <div className="work-section-header">
          Work Items
          <div className="work-filter-bar">
            {['all', 'open', 'in-progress', 'blocked', 'closed'].map(f => (
              <button
                key={f}
                className={`work-filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'in-progress' ? 'Active' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="work-items-list">
          {filtered.length === 0 && (
            <div className="empty">No work items match this filter</div>
          )}
          {filtered.map(item => {
            const s = (item.status || 'open').toLowerCase().replace('_', '-');
            return (
              <div
                key={item.id}
                className={`work-item-row work-item-row--${s}`}
                style={{ cursor: 'pointer' }}
                onClick={() => onDrillIssue?.(item.id)}
              >
                <div className="work-item-row__status">
                  <StatusBadge value={item.status || 'open'} />
                </div>
                <div className="work-item-row__body">
                  <div className="work-item-row__title">{item.title || item.id}</div>
                  <div className="work-item-row__meta">
                    <span className="work-item-row__id">{item.id}</span>
                    {item.assignee && (
                      <span
                        className="work-item-row__assignee cross-link cross-link--agent"
                        onClick={e => { e.stopPropagation(); onDrillAgent?.(item.assignee); }}
                      >
                        {item.assignee}
                      </span>
                    )}
                    {item.rig && item.rig !== 'town' && <span className="work-item-row__rig">{item.rig}</span>}
                    {item.issue_type && <StatusBadge value={item.issue_type} />}
                  </div>
                </div>
                <div className="work-item-row__time">
                  {relativeTime(item.updated_at || item.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
