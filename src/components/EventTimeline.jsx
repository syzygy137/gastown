import React from 'react';

function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ts; }
}

export default function EventTimeline({ events }) {
  if (!events.length) return <div className="empty">No events recorded</div>;

  return (
    <div className="event-list">
      {events.map((ev, i) => (
        <div key={ev.id || i} className="event-item">
          <span className="event-time">{formatTime(ev.created_at)}</span>
          <span className="event-kind">{ev.event_type || 'event'}</span>
          {ev.actor && <span className="event-actor"> {ev.actor}</span>}
          {ev.issue_id && <span> &rarr; {ev.issue_id}</span>}
          {ev.comment && <span style={{ color: 'var(--text-dim)' }}> {ev.comment.slice(0, 80)}</span>}
        </div>
      ))}
    </div>
  );
}
