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

export default function IssueBoard({ issues, dependencies = [] }) {
  const [expanded, setExpanded] = useState(new Set());

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
                  {issue.priority != null && (
                    <span className={`issue-priority ${pClass}`}>P{issue.priority}</span>
                  )}
                </div>
                <div className="issue-title">{issue.title || issue.id}</div>
                <div className="issue-meta">
                  <StatusBadge value={issue.issue_type} />
                  <StatusBadge value={issue.status} />
                  {issue.assignee && <span className="issue-assignee">{issue.assignee}</span>}
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
