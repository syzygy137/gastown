import { getSnapshot } from './db.js';
import { tmuxListSessions, tmuxCapture, tmuxCaptureAll, gitInfo, daemonStatus, polecatList } from './shell.js';
import { createHash } from 'crypto';

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
    const [sessions, polecats] = await Promise.all([tmuxListSessions(), polecatList()]);
    ws.send(JSON.stringify({ type: 'snapshot', ...snapshot, sessions, polecats }));
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
  }, intervals.dbMs);
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
  }, intervals.gitMs);
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

// Activity poll — every 3 seconds
let activityInterval = null;
let lastActivityHash = '';
export function startActivityPoll() {
  if (activityInterval) return;
  activityInterval = setInterval(async () => {
    try {
      const sessions = await tmuxCaptureAll(5);
      const activity = Object.entries(sessions).map(([name, data]) => ({
        session: name,
        agent: name,
        lastLines: data.lines,
        status: data.lines.length > 0 ? 'active' : 'idle',
        timestamp: new Date().toISOString(),
      }));
      const hash = createHash('md5').update(JSON.stringify(activity.map(a => a.lastLines))).digest('hex');
      if (hash !== lastActivityHash) {
        lastActivityHash = hash;
        broadcast({ type: 'activity', agents: activity });
      }
    } catch { /* ignore */ }
  }, 3000);
}

// Polecat poll — every 5 seconds
let polecatInterval = null;
let lastPolecatHash = '';
export function startPolecatPoll() {
  if (polecatInterval) return;
  polecatInterval = setInterval(async () => {
    try {
      const list = await polecatList();
      const hash = JSON.stringify(list);
      if (hash !== lastPolecatHash) {
        lastPolecatHash = hash;
        broadcast({ type: 'polecats', list });
      }
    } catch { /* ignore */ }
  }, 5000);
}

// Terminal stream poll — every 1.5 seconds (high-frequency, diff-based)
let terminalInterval = null;
let lastTerminalHashes = {};
export function startTerminalPoll() {
  if (terminalInterval) return;
  terminalInterval = setInterval(async () => {
    try {
      const sessions = await tmuxCaptureAll(100);
      const updates = {};
      for (const [name, data] of Object.entries(sessions)) {
        const hash = createHash('md5').update(data.output).digest('hex');
        if (hash !== lastTerminalHashes[name]) {
          lastTerminalHashes[name] = hash;
          updates[name] = data;
        }
      }
      if (Object.keys(updates).length > 0) {
        broadcast({ type: 'terminals', sessions: updates });
      }
    } catch { /* ignore */ }
  }, intervals.terminalMs);
}

// Configurable intervals (can be updated at runtime)
let intervals = {
  terminalMs: 1500,
  dbMs: 2000,
  gitMs: 30000,
};

export function getIntervals() {
  return { ...intervals };
}

export function setIntervals(newIntervals) {
  let changed = false;
  if (newIntervals.terminalMs != null && newIntervals.terminalMs !== intervals.terminalMs) {
    intervals.terminalMs = Math.max(500, Math.min(5000, newIntervals.terminalMs));
    changed = true;
    clearInterval(terminalInterval);
    terminalInterval = null;
    lastTerminalHashes = {};
    startTerminalPoll();
  }
  if (newIntervals.dbMs != null && newIntervals.dbMs !== intervals.dbMs) {
    intervals.dbMs = Math.max(1000, Math.min(10000, newIntervals.dbMs));
    changed = true;
    clearInterval(dbInterval);
    dbInterval = null;
    startDbPoll();
  }
  if (newIntervals.gitMs != null && newIntervals.gitMs !== intervals.gitMs) {
    intervals.gitMs = Math.max(10000, Math.min(60000, newIntervals.gitMs));
    changed = true;
    clearInterval(gitInterval);
    gitInterval = null;
    startGitPoll();
  }
  return changed;
}

export function startAll() {
  startDbPoll();
  startTmuxPoll();
  startGitPoll();
  startDaemonPoll();
  startActivityPoll();
  startTerminalPoll();
  startPolecatPoll();
}
