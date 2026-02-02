import React, { useState, useMemo } from 'react';
import StatusBadge from './StatusBadge.jsx';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MergeQueue({ issues, events }) {
  const [view, setView] = useState('queue');

  const mergeRequests = useMemo(() =>
    (issues || []).filter(i =>
      i.issue_type === 'merge-request' || i.issue_type === 'merge_request'
    ),
    [issues]
  );

  const queued = mergeRequests.filter(mr => (mr.status || 'open') === 'open');
  const refining = mergeRequests.filter(mr => mr.status === 'in-progress');
  const blocked = mergeRequests.filter(mr => mr.status === 'blocked');
  const merged = mergeRequests.filter(mr => mr.status === 'closed' || mr.status === 'done');
  const activeCount = queued.length + refining.length + blocked.length;

  const mergeEvents = useMemo(() =>
    (events || []).filter(ev =>
      ev.event_type === 'merge' || ev.event_type === 'merged' ||
      (ev.comment || '').toLowerCase().includes('merge')
    ).slice(0, 20),
    [events]
  );

  if (mergeRequests.length === 0 && mergeEvents.length === 0) {
    return (
      <div className="merge-queue">
        <div className="empty">No merge requests in queue</div>
      </div>
    );
  }

  return (
    <div className="merge-queue">
      <div className="mq-summary">
        <div className="mq-gauge">
          <span className="mq-gauge-num mq-gauge--queued">{queued.length}</span>
          <span className="mq-gauge-label">Queued</span>
        </div>
        <div className="mq-gauge">
          <span className="mq-gauge-num mq-gauge--refining">{refining.length}</span>
          <span className="mq-gauge-label">Refining</span>
        </div>
        <div className="mq-gauge">
          <span className="mq-gauge-num mq-gauge--blocked">{blocked.length}</span>
          <span className="mq-gauge-label">Blocked</span>
        </div>
        <div className="mq-gauge">
          <span className="mq-gauge-num mq-gauge--merged">{merged.length}</span>
          <span className="mq-gauge-label">Merged</span>
        </div>
      </div>

      <div className="mq-tabs">
        <button
          className={`mq-tab ${view === 'queue' ? 'active' : ''}`}
          onClick={() => setView('queue')}
        >
          Active Queue
          {activeCount > 0 && <span className="mq-tab-count">{activeCount}</span>}
        </button>
        <button
          className={`mq-tab ${view === 'history' ? 'active' : ''}`}
          onClick={() => setView('history')}
        >
          Merge History
          {merged.length > 0 && <span className="mq-tab-count">{merged.length}</span>}
        </button>
      </div>

      {view === 'queue' && (
        <div className="mq-sections">
          {refining.length > 0 && (
            <MqSection label="Refining" dot="refining" items={refining} variant="refining" />
          )}
          {blocked.length > 0 && (
            <MqSection label="Blocked" dot="blocked" items={blocked} variant="blocked" />
          )}
          {queued.length > 0 && (
            <MqSection label="Queued" dot="queued" items={queued} variant="queued" />
          )}
          {activeCount === 0 && (
            <div className="empty">Queue is clear — no active merge requests</div>
          )}
        </div>
      )}

      {view === 'history' && (
        <div className="mq-sections">
          {merged.length > 0 ? (
            <div className="mq-section">
              {merged.map(mr => (
                <MergeCard key={mr.id} mr={mr} variant="merged" />
              ))}
            </div>
          ) : mergeEvents.length > 0 ? (
            <div className="mq-section">
              {mergeEvents.map((ev, i) => (
                <div key={ev.id || i} className="mq-event">
                  <span className="mq-event-time">{timeAgo(ev.created_at)}</span>
                  <span className="mq-event-actor">{ev.actor || 'system'}</span>
                  <span className="mq-event-text">{ev.comment || ev.event_type}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No merge history yet</div>
          )}
        </div>
      )}
    </div>
  );
}

function MqSection({ label, dot, items, variant }) {
  return (
    <div className="mq-section">
      <div className="mq-section-header">
        <span className={`mq-section-dot mq-dot--${dot}`} />
        {label}
        <span className="count">{items.length}</span>
      </div>
      {items.map(mr => (
        <MergeCard key={mr.id} mr={mr} variant={variant} />
      ))}
    </div>
  );
}

function MergeCard({ mr, variant }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`mq-card mq-card--${variant}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="mq-card-header">
        <span className="mq-card-id">{mr.id}</span>
        <span className="mq-card-title">{mr.title || 'Untitled MR'}</span>
        <div className="mq-card-badges">
          <StatusBadge value={mr.status} />
          {mr.priority && <StatusBadge value={`P${mr.priority}`} />}
        </div>
      </div>
      <div className="mq-card-meta">
        {mr.assignee && <span className="mq-card-assignee">{mr.assignee}</span>}
        {mr.rig && <span className="mq-card-rig">{mr.rig}</span>}
        <span className="mq-card-time">{timeAgo(mr.created_at)}</span>
      </div>
      {variant === 'refining' && (
        <div className="mq-progress">
          <div className="mq-progress-bar">
            <div className="mq-progress-fill" />
          </div>
          <span className="mq-progress-label">refining</span>
        </div>
      )}
      {expanded && mr.description && (
        <div className="mq-card-desc">{mr.description}</div>
      )}
    </div>
  );
}
