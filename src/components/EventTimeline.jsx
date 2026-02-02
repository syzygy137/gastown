import React from 'react';

function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ts; }
}

const EVENT_ICON_MAP = {
  session_start: { icon: '\u25B6', cls: 'start' },
  session_end: { icon: '\u23F9', cls: 'end' },
  started: { icon: '\u25B6', cls: 'start' },
  stopped: { icon: '\u23F9', cls: 'end' },
  spawn: { icon: '\u25B6', cls: 'start' },
  mail: { icon: '\u2709', cls: 'mail' },
  mail_sent: { icon: '\u2709', cls: 'mail' },
  mail_received: { icon: '\u2709', cls: 'mail' },
  merge: { icon: '\u26A1', cls: 'merge' },
  merged: { icon: '\u26A1', cls: 'merge' },
  'merge-request': { icon: '\u26A1', cls: 'merge' },
  error: { icon: '\u26A0', cls: 'error' },
  failure: { icon: '\u26A0', cls: 'error' },
  created: { icon: '\u2726', cls: 'default' },
  updated: { icon: '\u2727', cls: 'default' },
  closed: { icon: '\u2713', cls: 'end' },
};

function getEventIcon(type) {
  const t = (type || '').toLowerCase();
  if (EVENT_ICON_MAP[t]) return EVENT_ICON_MAP[t];
  for (const [key, val] of Object.entries(EVENT_ICON_MAP)) {
    if (t.includes(key)) return val;
  }
  return { icon: '\u25CF', cls: 'default' };
}

export default function EventTimeline({ events }) {
  if (!events.length) return <div className="empty">No events recorded</div>;

  return (
    <div className="event-list">
      {events.map((ev, i) => {
        const ei = getEventIcon(ev.event_type);
        return (
          <div key={ev.id || i} className="event-item">
            <span className={`event-icon event-icon--${ei.cls}`}>{ei.icon}</span>
            <span className="event-time">{formatTime(ev.created_at)}</span>
            <span className="event-kind">{ev.event_type || 'event'}</span>
            {ev.actor && <span className="event-actor"> {ev.actor}</span>}
            {ev.issue_id && <span> &rarr; {ev.issue_id}</span>}
            {ev.comment && <span style={{ color: 'var(--text-dim)' }}> {ev.comment.slice(0, 80)}</span>}
          </div>
        );
      })}
    </div>
  );
}
