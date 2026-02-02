import React from 'react';

function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ts; }
}

export default function MailFeed({ mail }) {
  if (!mail.length) return <div className="empty">No mail messages</div>;

  return (
    <div className="mail-list">
      {mail.map(m => (
        <div key={m.id} className="mail-item">
          <div className="mail-subject">{m.title || '(no subject)'}</div>
          <div className="mail-meta">
            {m.assignee && <span>From: {m.assignee} </span>}
            {m.target && <span>To: {m.target} </span>}
            <span>{formatTime(m.created_at)}</span>
          </div>
          {m.description && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              {m.description.slice(0, 200)}{m.description.length > 200 ? '...' : ''}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
