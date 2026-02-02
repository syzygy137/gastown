import React, { useState, useMemo } from 'react';
import Tooltip from './Tooltip.jsx';
import LinkedText from './LinkedText.jsx';

const ROLE_COLORS = {
  mayor: '#d29922',
  deacon: '#58a6ff',
  witness: '#3fb950',
  refinery: '#bc8cff',
  polecat: '#f0883e',
  overseer: '#39d2c0',
};

function getAvatarColor(name) {
  if (!name) return '#8b949e';
  const lower = name.toLowerCase();
  for (const [role, color] of Object.entries(ROLE_COLORS)) {
    if (lower.includes(role)) return color;
  }
  const colors = Object.values(ROLE_COLORS);
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

function relativeTime(ts) {
  if (!ts) return '';
  try {
    const now = Date.now();
    const then = new Date(ts).getTime();
    const diff = Math.max(0, now - then);
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return ts;
  }
}

function isRecent(ts) {
  if (!ts) return false;
  try {
    return Date.now() - new Date(ts).getTime() < 5 * 60 * 1000;
  } catch {
    return false;
  }
}

function threadKey(m) {
  if (m.thread_id) return m.thread_id;
  const subj = (m.title || '').replace(/^(Re|Fwd|RE|FW):\s*/g, '').trim();
  return subj || m.id;
}

function groupByThread(mail) {
  const threads = new Map();
  const order = [];
  for (const m of mail) {
    const key = threadKey(m);
    if (!threads.has(key)) {
      threads.set(key, []);
      order.push(key);
    }
    threads.get(key).push(m);
  }
  return order.map(key => ({ key, messages: threads.get(key) }));
}

function MailItem({ m, isReply, onDrillAgent, onDrillIssue }) {
  const [expanded, setExpanded] = useState(false);
  const recent = isRecent(m.created_at);
  const hasLongDesc = m.description && m.description.length > 200;
  const tooltipText = m.description && !expanded
    ? m.description.slice(0, 300) + (m.description.length > 300 ? '...' : '')
    : null;

  return (
    <Tooltip content={tooltipText} delay={400}>
      <div
        className={`mail-item${recent ? ' mail-unread' : ''}${isReply ? ' mail-reply' : ''}`}
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <div className="mail-item-row">
          <span
            className="mail-avatar"
            style={{ background: getAvatarColor(m.assignee) }}
          >
            {(m.assignee || '?')[0].toUpperCase()}
          </span>
          <div className="mail-item-content">
            <div className={`mail-subject${recent ? ' mail-subject-unread' : ''}`}>
              {m.title || '(no subject)'}
            </div>
            <div className="mail-meta">
              {m.assignee && (
                <span
                  className="mail-from cross-link cross-link--agent"
                  onClick={e => { e.stopPropagation(); onDrillAgent?.(m.assignee); }}
                >
                  {m.assignee}
                </span>
              )}
              {m.assignee && m.target && <span className="mail-arrow">&rarr;</span>}
              {m.target && (
                <span
                  className="mail-to cross-link cross-link--agent"
                  onClick={e => { e.stopPropagation(); onDrillAgent?.(m.target); }}
                >
                  {m.target}
                </span>
              )}
              <span className="mail-time">{relativeTime(m.created_at)}</span>
            </div>
          </div>
        </div>
        {m.description && (
          <div className={`mail-desc${expanded ? ' mail-desc-expanded' : ''}`}>
            {expanded ? (
              <LinkedText
                text={m.description}
                onClickIssue={onDrillIssue}
                onClickAgent={onDrillAgent}
              />
            ) : (
              `${m.description.slice(0, 200)}${hasLongDesc ? '...' : ''}`
            )}
          </div>
        )}
      </div>
    </Tooltip>
  );
}

function ComposeForm({ agents, onClose }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async () => {
    if (!to || !subject || !body) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body }),
      });
      const data = await res.json();
      if (data.ok) {
        onClose();
      } else {
        setError(data.error || 'Send failed');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mail-compose">
      <div className="mail-compose-header">
        <span>New Message</span>
        <button className="mail-compose-close" onClick={onClose}>&times;</button>
      </div>
      <div className="mail-compose-field">
        <label>To</label>
        <select value={to} onChange={e => setTo(e.target.value)}>
          <option value="">Select recipient...</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.id}</option>
          ))}
        </select>
      </div>
      <div className="mail-compose-field">
        <label>Subject</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject..."
        />
      </div>
      <div className="mail-compose-field">
        <label>Body</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Message body..."
          rows={4}
        />
      </div>
      {error && <div className="mail-compose-error">{error}</div>}
      <button
        className="mail-compose-send"
        onClick={handleSend}
        disabled={sending || !to || !subject || !body}
      >
        {sending ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
}

export default function MailFeed({ mail, agents = [], onDrillAgent, onDrillIssue }) {
  const [composing, setComposing] = useState(false);
  const threads = useMemo(() => groupByThread(mail), [mail]);

  if (!mail.length && !composing) {
    return (
      <div>
        <button className="mail-compose-btn" onClick={() => setComposing(true)}>+ New Message</button>
        {composing && <ComposeForm agents={agents} onClose={() => setComposing(false)} />}
        <div className="empty">No mail messages</div>
      </div>
    );
  }

  return (
    <div className="mail-feed">
      <div className="mail-toolbar">
        <button className="mail-compose-btn" onClick={() => setComposing(true)}>+ New Message</button>
      </div>
      {composing && <ComposeForm agents={agents} onClose={() => setComposing(false)} />}
      <div className="mail-list">
        {threads.map(thread => (
          <div key={thread.key} className="mail-thread">
            {thread.messages.length > 1 && (
              <div className="mail-thread-badge">{thread.messages.length} messages</div>
            )}
            {thread.messages.map((m, i) => (
              <MailItem
                key={m.id}
                m={m}
                isReply={i > 0}
                onDrillAgent={onDrillAgent}
                onDrillIssue={onDrillIssue}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
