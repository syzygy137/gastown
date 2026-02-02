import React, { useState, useMemo } from 'react';
import StatusBadge from './StatusBadge.jsx';

const COLUMNS = [
  { key: 'open', label: 'Open' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'closed', label: 'Done' },
];

const STATUS_MAP = {
  hooked: 'in-progress',
  in_progress: 'in-progress',
};

const PRIORITY_CLASSES = {
  0: 'issue-priority-P0',
  1: 'issue-priority-P1',
  2: 'issue-priority-P2',
  3: 'issue-priority-P3',
};

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function SlingButton({ issueId }) {
  const [state, setState] = useState('idle');
  const [showTarget, setShowTarget] = useState(false);
  const [target, setTarget] = useState('');

  async function sling(e) {
    e.stopPropagation();
    setState('loading');
    const args = ['sling', issueId];
    if (target.trim()) args.push(target.trim());
    try {
      const res = await fetch('/api/cmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: 'gt', args }),
      });
      const data = await res.json();
      setState(data.ok && !data.error ? 'success' : 'error');
    } catch {
      setState('error');
    }
    setTimeout(() => setState('idle'), 2000);
  }

  function toggleTarget(e) {
    e.stopPropagation();
    setShowTarget(prev => !prev);
  }

  const label = state === 'loading' ? '...'
    : state === 'success' ? '\u2713'
    : state === 'error' ? '\u2717'
    : '\u27B3';

  return (
    <span className="sling-control" onClick={e => e.stopPropagation()}>
      <button
        className={`sling-btn sling-btn--${state}`}
        onClick={sling}
        disabled={state === 'loading'}
        title={`Sling ${issueId}${target ? ' to ' + target : ''}`}
      >
        {label}
      </button>
      <button
        className={`sling-target-toggle ${showTarget ? 'active' : ''}`}
        onClick={toggleTarget}
        title="Set target"
      >
        {'\u25BE'}
      </button>
      {showTarget && (
        <input
          className="sling-target-input"
          type="text"
          value={target}
          onChange={e => setTarget(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sling(e); }}
          onClick={e => e.stopPropagation()}
          placeholder="target"
        />
      )}
    </span>
  );
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

export default function IssueBoard({ issues, dependencies = [], agents = [], polecats = [] }) {
  const [expanded, setExpanded] = useState(new Set());

  // Build a map of issue_id → agent name for hooked issues
  const hookMap = useMemo(() => {
    const m = {};
    for (const agent of agents) {
      const meta = parseAgentMeta(agent.description);
      const hookBead = meta.hook_bead || agent.hook_bead;
      if (hookBead) {
        const name = (agent.title || agent.id).split(' - ')[0].split(' (')[0];
        m[hookBead] = name;
      }
    }
    // Also check issue assignees — if assignee matches a polecat path, use polecat name
    return m;
  }, [agents]);

  const depsMap = useMemo(() => {
    const m = {};
    for (const dep of dependencies) {
      if (!m[dep.issue_id]) m[dep.issue_id] = [];
      m[dep.issue_id].push(dep.depends_on || dep.dependency_id || dep.target_id);
    }
    return m;
  }, [dependencies]);

  const toggle = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const grouped = {};
  for (const col of COLUMNS) grouped[col.key] = [];

  for (const issue of issues) {
    const raw = (issue.status || 'open').toLowerCase();
    const mapped = STATUS_MAP[raw] || raw;
    if (grouped[mapped]) grouped[mapped].push(issue);
    else grouped['open'].push(issue);
  }

  return (
    <div className="issue-columns">
      {COLUMNS.map(col => (
        <div key={col.key} className="issue-col">
          <div className="issue-col-title">
            {col.label}
            <span className="count">{grouped[col.key].length}</span>
          </div>
          {grouped[col.key].map(issue => {
            const isExpanded = expanded.has(issue.id);
            const pClass = PRIORITY_CLASSES[issue.priority] || '';
            const deps = depsMap[issue.id];
            return (
              <div
                key={issue.id}
                className={`issue-card${isExpanded ? ' issue-card--expanded' : ''}`}
                onClick={() => toggle(issue.id)}
              >
                <div className="issue-card__header">
                  <span className="issue-id">{issue.id}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {issue.priority != null && (
                      <span className={`issue-priority ${pClass}`}>P{issue.priority}</span>
                    )}
                    <SlingButton issueId={issue.id} />
                  </span>
                </div>
                <div className="issue-title">{issue.title || issue.id}</div>
                <div className="issue-meta">
                  <StatusBadge value={issue.issue_type} />
                  <StatusBadge value={issue.status} />
                  {issue.assignee && <span className="issue-assignee">{issue.assignee}</span>}
                  {hookMap[issue.id] && (
                    <span className="issue-hook-tag" title={`Hooked by ${hookMap[issue.id]}`}>
                      on {hookMap[issue.id]}'s hook
                    </span>
                  )}
                </div>
                {isExpanded && (
                  <div className="issue-expanded">
                    {issue.description && (
                      <div className="issue-description">{issue.description}</div>
                    )}
                    <div className="issue-detail-grid">
                      {issue.rig && (
                        <div className="issue-detail-row">
                          <span className="issue-detail-label">Rig</span>
                          <span className="issue-detail-value">{issue.rig}</span>
                        </div>
                      )}
                      {issue.owner && (
                        <div className="issue-detail-row">
                          <span className="issue-detail-label">Owner</span>
                          <span className="issue-detail-value">{issue.owner}</span>
                        </div>
                      )}
                      {issue.assignee && (
                        <div className="issue-detail-row">
                          <span className="issue-detail-label">Assignee</span>
                          <span className="issue-detail-value">{issue.assignee}</span>
                        </div>
                      )}
                      {deps && deps.length > 0 && (
                        <div className="issue-detail-row">
                          <span className="issue-detail-label">Deps</span>
                          <span className="issue-detail-value">{deps.join(', ')}</span>
                        </div>
                      )}
                      {issue.created_at && (
                        <div className="issue-detail-row">
                          <span className="issue-detail-label">Created</span>
                          <span className="issue-detail-value">{timeAgo(issue.created_at)}</span>
                        </div>
                      )}
                      {issue.updated_at && (
                        <div className="issue-detail-row">
                          <span className="issue-detail-label">Updated</span>
                          <span className="issue-detail-value">{timeAgo(issue.updated_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {grouped[col.key].length === 0 && (
            <div className="empty" style={{ padding: 8 }}>-</div>
          )}
        </div>
      ))}
    </div>
  );
}
