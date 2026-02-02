import React from 'react';
import StatusBadge from './StatusBadge.jsx';

const COLUMNS = [
  { key: 'open', label: 'Open' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'closed', label: 'Done' },
];

export default function IssueBoard({ issues }) {
  const grouped = {};
  for (const col of COLUMNS) grouped[col.key] = [];

  for (const issue of issues) {
    const s = (issue.status || 'open').toLowerCase();
    if (grouped[s]) grouped[s].push(issue);
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
          {grouped[col.key].map(issue => (
            <div key={issue.id} className="issue-card">
              <div className="issue-title">{issue.title || issue.id}</div>
              <div className="issue-meta">
                <StatusBadge value={issue.issue_type} />
                {issue.assignee && <span> {issue.assignee}</span>}
                {issue.priority && <span> P{issue.priority}</span>}
              </div>
            </div>
          ))}
          {grouped[col.key].length === 0 && (
            <div className="empty" style={{ padding: 8 }}>-</div>
          )}
        </div>
      ))}
    </div>
  );
}
