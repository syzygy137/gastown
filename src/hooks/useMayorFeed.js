import { useState, useEffect, useRef, useCallback } from 'react';

let nextId = 1;

function makeMsg(text, type) {
  return { id: nextId++, text, timestamp: new Date().toISOString(), type };
}

/**
 * Extract mayor-relevant announcements from a WebSocket message.
 * Returns an array of {text, type} objects (may be empty).
 */
function extractMayorEvents(data, prev) {
  const msgs = [];

  if (data.type === 'snapshot') {
    // --- Mail: new messages ---
    if (data.mail && data.mail.length > 0) {
      const prevIds = prev.mailIds;
      for (const m of data.mail) {
        const mid = m.id || `${m.from}-${m.timestamp}`;
        if (prevIds.size > 0 && !prevIds.has(mid)) {
          const from = m.from || 'unknown';
          const subj = m.subject || m.description?.slice(0, 80) || '(no subject)';
          msgs.push({ text: `Mail received from ${from}: ${subj}`, type: 'mail' });
        }
      }
      prev.mailIds = new Set(data.mail.map(m => m.id || `${m.from}-${m.timestamp}`));
    }

    // --- Agents: state changes ---
    if (data.agents && data.agents.length > 0) {
      for (const a of data.agents) {
        const name = a.name || a.id;
        const st = a.agent_state || a.state || a.status || 'idle';
        const prevSt = prev.agentStates[name];
        if (prevSt && prevSt !== st) {
          msgs.push({ text: `${name} changed status: ${prevSt} → ${st}`, type: 'status' });
        }
        prev.agentStates[name] = st;
      }
    }

    // --- Issues: work dispatched / completed ---
    if (data.issues && data.issues.length > 0) {
      for (const iss of data.issues) {
        const iid = iss.id || iss.key;
        const st = (iss.state || iss.status || '').toLowerCase();
        const title = iss.title || iss.subject || iid;
        const prevSt = prev.issueStates[iid];

        if (!prevSt && prev.initialized) {
          // New issue appeared
          const assignee = iss.assignee || '';
          msgs.push({
            text: `Work dispatched: ${title}${assignee ? ` → ${assignee}` : ''}`,
            type: 'dispatch',
          });
        } else if (prevSt && prevSt !== st) {
          if (st === 'closed' || st === 'done') {
            msgs.push({ text: `Work completed: ${title}`, type: 'dispatch' });
          } else if (st === 'in_progress' && prevSt !== 'in_progress') {
            msgs.push({ text: `Work started: ${title}`, type: 'dispatch' });
          }
        }
        prev.issueStates[iid] = st;
      }
      prev.initialized = true;
    }
  }

  if (data.type === 'activity' && data.agents) {
    for (const a of data.agents) {
      const name = a.agent || a.session;
      const st = a.status || 'idle';
      const prevSt = prev.activityStates[name];
      if (prevSt && prevSt !== st) {
        msgs.push({ text: `${name} is now ${st}`, type: 'status' });
      }
      prev.activityStates[name] = st;
    }
  }

  if (data.type === 'daemon') {
    const running = data.running;
    if (prev.daemonRunning !== null && prev.daemonRunning !== running) {
      msgs.push({
        text: running ? 'Daemon started' : 'Daemon stopped',
        type: 'status',
      });
    }
    prev.daemonRunning = running;
  }

  return msgs;
}

const MAX_MESSAGES = 200;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

export default function useMayorFeed() {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [latestMessage, setLatestMessage] = useState(null);

  const wsRef = useRef(null);
  const retryRef = useRef(null);
  const attemptsRef = useRef(0);
  const prevRef = useRef({
    mailIds: new Set(),
    agentStates: {},
    issueStates: {},
    activityStates: {},
    daemonRunning: null,
    initialized: false,
  });

  const pushMessages = useCallback((newMsgs) => {
    if (newMsgs.length === 0) return;
    const entries = newMsgs.map(m => makeMsg(m.text, m.type));
    const latest = entries[entries.length - 1];
    setLatestMessage(latest);
    setMessages(prev => {
      const combined = [...prev, ...entries];
      return combined.length > MAX_MESSAGES
        ? combined.slice(combined.length - MAX_MESSAGES)
        : combined;
    });
  }, []);

  const connect = useCallback(() => {
    const ws = new WebSocket('ws://localhost:3737/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      attemptsRef.current = 0;
    };

    ws.onclose = () => {
      setConnected(false);
      const delay = Math.min(BASE_DELAY * Math.pow(2, attemptsRef.current), MAX_DELAY);
      attemptsRef.current++;
      retryRef.current = setTimeout(connect, delay);
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const extracted = extractMayorEvents(data, prevRef.current);
        pushMessages(extracted);
      } catch { /* ignore malformed messages */ }
    };
  }, [pushMessages]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { messages, connected, latestMessage };
}
