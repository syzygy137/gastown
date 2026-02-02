import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import StatusBadge from './StatusBadge.jsx';
import Tooltip from './Tooltip.jsx';
import LinkedText from './LinkedText.jsx';
import ContextMenu, { useContextMenu } from './ContextMenu.jsx';

const COLUMNS = [
  { key: 'open', label: 'Open' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'closed', label: 'Done' },
];

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'closed', label: 'Closed' },
];

const TYPE_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'task', label: 'task' },
  { key: 'bug', label: 'bug' },
  { key: 'feature', label: 'feature' },
  { key: 'agent', label: 'agent' },
  { key: 'message', label: 'message' },
  { key: 'merge-request', label: 'merge-request' },
  { key: 'molecule', label: 'molecule' },
  { key: 'epic', label: 'epic' },
  { key: 'convoy', label: 'convoy' },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'priority', label: 'Priority' },
  { key: 'updated', label: 'Recently updated' },
];

// Persist filter state across tab switches (component remounts due to key={activeTab})
const _filterCache = { search: '', status: 'all', type: 'all', sort: 'newest' };

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

export default function IssueBoard({ issues, dependencies = [], agents = [], polecats = [], focusIssueId, onClearFocus, onDrillAgent, onDrillIssue, changedIds = new Set() }) {
  const [expanded, setExpanded] = useState(new Set());
  const [search, setSearch] = useState(_filterCache.search);
  const [statusFilter, setStatusFilter] = useState(_filterCache.status);
  const [typeFilter, setTypeFilter] = useState(_filterCache.type);
  const [sortBy, setSortBy] = useState(_filterCache.sort);
  const searchRef = useRef(null);
  const [ctxMenu, showCtxMenu, hideCtxMenu] = useContextMenu();

  // Sync to cache on changes
  useEffect(() => { _filterCache.search = search; }, [search]);
  useEffect(() => { _filterCache.status = statusFilter; }, [statusFilter]);
  useEffect(() => { _filterCache.type = typeFilter; }, [typeFilter]);
  useEffect(() => { _filterCache.sort = sortBy; }, [sortBy]);

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
    return m;
  }, [agents]);

  useEffect(() => {
    if (focusIssueId) {
      setExpanded(prev => {
        const next = new Set(prev);
        next.add(focusIssueId);
        return next;
      });
      setTimeout(() => {
        const el = document.querySelector(`[data-issue-id="${focusIssueId}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [focusIssueId]);

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

  // Collect unique types from actual data for showing only relevant type chips
  const presentTypes = useMemo(() => {
    const s = new Set();
    for (const issue of issues) {
      if (issue.issue_type) s.add(issue.issue_type.toLowerCase());
    }
    return s;
  }, [issues]);

  const visibleTypeOptions = useMemo(() =>
    TYPE_OPTIONS.filter(t => t.key === 'all' || presentTypes.has(t.key)),
    [presentTypes]
  );

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return issues.filter(issue => {
      // Text search across id, title, description, assignee
      if (q) {
        const haystack = [issue.id, issue.title, issue.description, issue.assignee]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Status filter
      if (statusFilter !== 'all') {
        const raw = (issue.status || 'open').toLowerCase();
        const mapped = STATUS_MAP[raw] || raw;
        if (mapped !== statusFilter) return false;
      }
      // Type filter
      if (typeFilter !== 'all') {
        const t = (issue.issue_type || '').toLowerCase();
        if (t !== typeFilter) return false;
      }
      return true;
    });
  }, [issues, search, statusFilter, typeFilter]);

  const sortFn = useMemo(() => {
    if (sortBy === 'priority') return (a, b) => (a.priority ?? 99) - (b.priority ?? 99);
    if (sortBy === 'updated') return (a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta;
    };
    // newest (by created_at desc)
    return (a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    };
  }, [sortBy]);

  const slingIssue = useCallback(async (issueId) => {
    await fetch('/api/cmd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd: 'gt', args: ['sling', issueId] }),
    });
  }, []);

  const ctxMenuItems = useMemo(() => {
    if (!ctxMenu.visible || !ctxMenu.data) return [];
    const issue = ctxMenu.data;
    const items = [];
    items.push({
      label: 'Sling to rig',
      icon: '\u27B3',
      action: () => slingIssue(issue.id),
    });
    items.push({
      label: 'Copy issue ID',
      icon: '\u{1F4CB}',
      action: () => navigator.clipboard?.writeText(issue.id),
    });
    items.push({ separator: true });
    items.push({
      label: 'Open detail view',
      icon: '\u{1F4C4}',
      action: () => onDrillIssue?.(issue.id),
    });
    const status = (issue.status || '').toLowerCase();
    if (status !== 'closed') {
      items.push({
        label: 'Close issue',
        icon: '\u2713',
        action: async () => {
          await fetch('/api/cmd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cmd: 'bd', args: ['update', issue.id, '--status=closed'] }),
          });
        },
      });
    }
    return items;
  }, [ctxMenu.visible, ctxMenu.data, onDrillIssue, slingIssue]);

  const grouped = {};
  for (const col of COLUMNS) grouped[col.key] = [];

  for (const issue of filtered) {
    const raw = (issue.status || 'open').toLowerCase();
    const mapped = STATUS_MAP[raw] || raw;
    if (grouped[mapped]) grouped[mapped].push(issue);
    else grouped['open'].push(issue);
  }

  for (const col of COLUMNS) grouped[col.key].sort(sortFn);

  const totalCount = issues.length;
  const filteredCount = filtered.length;
  const hasActiveFilters = search || statusFilter !== 'all' || typeFilter !== 'all';

  return (
    <div className="issue-board-container">
      {/* Toolbar */}
      <div className="issue-toolbar">
        <div className="issue-toolbar__row">
          <div className="issue-search-wrap">
            <input
              ref={searchRef}
              className="issue-search"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search issues..."
            />
            {search && (
              <button className="issue-search-clear" onClick={() => setSearch('')} title="Clear search">&times;</button>
            )}
          </div>
          <div className="issue-sort-wrap">
            <select
              className="issue-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
          <span className="issue-result-count">
            {hasActiveFilters ? `${filteredCount} of ${totalCount}` : totalCount} issue{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="issue-toolbar__row">
          <div className="issue-filter-group">
            <span className="issue-filter-label">Status</span>
            {STATUS_FILTERS.map(sf => (
              <button
                key={sf.key}
                className={`issue-filter-chip${statusFilter === sf.key ? ' active' : ''}`}
                onClick={() => setStatusFilter(sf.key)}
              >
                {sf.label}
              </button>
            ))}
          </div>
          {visibleTypeOptions.length > 2 && (
            <div className="issue-filter-group">
              <span className="issue-filter-label">Type</span>
              {visibleTypeOptions.map(tf => (
                <button
                  key={tf.key}
                  className={`issue-filter-chip${typeFilter === tf.key ? ' active' : ''}`}
                  onClick={() => setTypeFilter(tf.key)}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Kanban columns */}
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
            const tooltipText = issue.description
              ? issue.description.slice(0, 200) + (issue.description.length > 200 ? '...' : '')
              : null;
            return (
              <Tooltip key={issue.id} content={tooltipText} delay={400}>
                <div
                  data-issue-id={issue.id}
                  className={`issue-card${isExpanded ? ' issue-card--expanded' : ''}${issue.id === focusIssueId ? ' issue-card--focused' : ''}${changedIds.has(issue.id) ? ' bg-flash' : ''}`}
                  onClick={() => toggle(issue.id)}
                  onContextMenu={e => showCtxMenu(e, issue)}
                >
                  <div className="issue-card__header">
                    <span
                      className="issue-id cross-link cross-link--issue"
                      onClick={e => { e.stopPropagation(); onDrillIssue?.(issue.id); }}
                    >
                      {issue.id}
                    </span>
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
                    {issue.assignee && (
                      <span
                        className="issue-assignee cross-link cross-link--agent"
                        onClick={e => { e.stopPropagation(); onDrillAgent?.(issue.assignee); }}
                      >
                        {issue.assignee}
                      </span>
                    )}
                    {hookMap[issue.id] && (
                      <span className="issue-hook-tag" title={`Hooked by ${hookMap[issue.id]}`}>
                        on {hookMap[issue.id]}'s hook
                      </span>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="issue-expanded">
                      {issue.description && (
                        <div className="issue-description">
                          <LinkedText
                            text={issue.description}
                            onClickIssue={onDrillIssue}
                            onClickAgent={onDrillAgent}
                          />
                        </div>
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
                            <span className="issue-detail-value">
                              <LinkedText text={issue.owner} onClickAgent={onDrillAgent} onClickIssue={onDrillIssue} />
                            </span>
                          </div>
                        )}
                        {issue.assignee && (
                          <div className="issue-detail-row">
                            <span className="issue-detail-label">Assignee</span>
                            <span className="issue-detail-value">
                              <LinkedText text={issue.assignee} onClickAgent={onDrillAgent} onClickIssue={onDrillIssue} />
                            </span>
                          </div>
                        )}
                        {deps && deps.length > 0 && (
                          <div className="issue-detail-row">
                            <span className="issue-detail-label">Deps</span>
                            <span className="issue-detail-value">
                              {deps.map((d, i) => (
                                <span key={d}>
                                  {i > 0 && ', '}
                                  <span
                                    className="cross-link cross-link--issue"
                                    onClick={e => { e.stopPropagation(); onDrillIssue?.(d); }}
                                  >
                                    {d}
                                  </span>
                                </span>
                              ))}
                            </span>
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
              </Tooltip>
            );
          })}
          {grouped[col.key].length === 0 && (
            <div className="empty" style={{ padding: 8 }}>-</div>
          )}
        </div>
      ))}
      {ctxMenu.visible && ctxMenuItems.length > 0 && (
        <ContextMenu items={ctxMenuItems} position={ctxMenu.position} onClose={hideCtxMenu} />
      )}
    </div>
    </div>
  );
}
