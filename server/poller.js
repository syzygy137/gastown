import { getSnapshot } from './db.js';
import { tmuxListSessions, tmuxCapture, gitInfo, daemonStatus } from './shell.js';

let lastHash = '';
let clients = new Set();

export function addClient(ws) {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
  // Send current state immediately
  sendSnapshot(ws);
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

async function sendSnapshot(ws) {
  try {
    const snapshot = getSnapshot();
    const sessions = await tmuxListSessions();
    ws.send(JSON.stringify({ type: 'snapshot', ...snapshot, sessions }));
  } catch (e) {
    ws.send(JSON.stringify({ type: 'error', message: e.message }));
  }
}

// DB poll — every 2 seconds
let dbInterval = null;
export function startDbPoll() {
  if (dbInterval) return;
  dbInterval = setInterval(async () => {
    try {
      const snapshot = getSnapshot();
      const hash = JSON.stringify(snapshot.counts) + snapshot.issues.length + snapshot.events.length;
      if (hash !== lastHash) {
        lastHash = hash;
        broadcast({ type: 'snapshot', ...snapshot });
      }
    } catch (e) {
      broadcast({ type: 'error', message: e.message });
    }
  }, 2000);
}

// Tmux poll — every 5 seconds
let tmuxInterval = null;
export function startTmuxPoll() {
  if (tmuxInterval) return;
  tmuxInterval = setInterval(async () => {
    try {
      const sessions = await tmuxListSessions();
      broadcast({ type: 'tmux', sessions });
    } catch { /* ignore */ }
  }, 5000);
}

// Git poll — every 30 seconds
let gitInterval = null;
export function startGitPoll() {
  if (gitInterval) return;
  gitInterval = setInterval(async () => {
    try {
      const git = await gitInfo();
      broadcast({ type: 'git', ...git });
    } catch { /* ignore */ }
  }, 30000);
}

// Daemon poll — every 10 seconds
let daemonInterval = null;
export function startDaemonPoll() {
  if (daemonInterval) return;
  daemonInterval = setInterval(async () => {
    try {
      const status = await daemonStatus();
      broadcast({ type: 'daemon', ...status });
    } catch { /* ignore */ }
  }, 10000);
}

export function startAll() {
  startDbPoll();
  startTmuxPoll();
  startGitPoll();
  startDaemonPoll();
}
