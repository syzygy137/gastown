import { useReducer, useEffect, useRef, useCallback } from 'react';

const initial = {
  connected: false,
  messages: [],
  agents: [],
  issues: [],
  mail: [],
  events: [],
  polecats: [],
  sessions: [],
  daemon: { running: false, output: '' },
};

function reducer(state, action) {
  switch (action.type) {
    case 'connected':
      return { ...state, connected: true };
    case 'disconnected':
      return { ...state, connected: false };
    case 'snapshot':
      return {
        ...state,
        agents: action.agents || state.agents,
        issues: action.issues || state.issues,
        mail: action.mail || state.mail,
        events: action.events || state.events,
        polecats: action.polecats || state.polecats,
        sessions: action.sessions || state.sessions,
      };
    case 'daemon':
      return { ...state, daemon: { running: action.running, output: action.output } };
    case 'polecats':
      return { ...state, polecats: action.list || state.polecats };
    case 'mayor_message': {
      const msg = {
        id: action.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: action.text,
        timestamp: action.timestamp || new Date().toISOString(),
      };
      return { ...state, messages: [...state.messages, msg] };
    }
    default:
      return state;
  }
}

export default function useMayorFeed() {
  const [state, dispatch] = useReducer(reducer, initial);
  const wsRef = useRef(null);
  const retryRef = useRef(null);

  const connect = useCallback(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => dispatch({ type: 'connected' });

    ws.onclose = () => {
      dispatch({ type: 'disconnected' });
      retryRef.current = setTimeout(connect, 3000);
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        dispatch(data);

        // Synthesize mayor messages from mail and events
        if (data.type === 'snapshot' && data.mail) {
          const mayorMail = data.mail.filter(
            (m) => m.from && m.from.toLowerCase().includes('mayor')
          );
          for (const m of mayorMail) {
            const id = m.id || `mail-${m.timestamp}`;
            dispatch({
              type: 'mayor_message',
              id,
              text: m.subject || m.description?.slice(0, 120) || 'New directive',
              timestamp: m.timestamp || m.created,
            });
          }
        }
      } catch {
        /* ignore bad messages */
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return state;
}
