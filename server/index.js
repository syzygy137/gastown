import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { getIssues, getAgents, getMail, getEvents, getLabels, getIssueCounts, getConfig as getDbConfig, getRigs } from './db.js';
import { tmuxListSessions, tmuxCapture, tmuxCaptureAll, gitInfo, daemonStatus, loadFormulas, loadConfig, runCommand } from './shell.js';
import { addClient, startAll, getIntervals, setIntervals } from './poller.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());

// Cache formulas and config at startup
let formulas = {};
let config = {};

async function init() {
  formulas = await loadFormulas();
  config = await loadConfig();
}

// --- REST endpoints ---

app.get('/api/town', async (req, res) => {
  try {
    const [agents, counts, daemon, git] = await Promise.all([
      getAgents(),
      getIssueCounts(),
      daemonStatus(),
      gitInfo(),
    ]);
    res.json({ agents, counts, daemon, git, config });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/agents', (req, res) => {
  try { res.json(getAgents()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/issues', (req, res) => {
  try {
    const { type, status, limit } = req.query;
    res.json(getIssues({ type, status, limit: limit ? parseInt(limit) : undefined }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/mail', (req, res) => {
  try { res.json(getMail()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/events', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    res.json(getEvents({ limit }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/formulas', (req, res) => {
  const list = Object.values(formulas).map(f => ({
    name: f.name, file: f.file, error: f.error || null,
    title: f.formula?.title || f.name,
    description: f.formula?.description || '',
  }));
  res.json(list);
});

app.get('/api/formulas/:name', (req, res) => {
  const f = formulas[req.params.name];
  if (!f) return res.status(404).json({ error: 'Formula not found' });
  res.json(f);
});

app.get('/api/sessions', async (req, res) => {
  try { res.json(await tmuxListSessions()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/sessions/:name', async (req, res) => {
  try { res.json({ name: req.params.name, output: await tmuxCapture(req.params.name) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/activity', async (req, res) => {
  try {
    const sessions = await tmuxCaptureAll(5);
    const activity = Object.entries(sessions).map(([name, data]) => ({
      session: name,
      agent: name,
      lastLines: data.lines,
      status: data.lines.length > 0 ? 'active' : 'idle',
      timestamp: new Date().toISOString(),
    }));
    res.json(activity);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/sessions/all', async (req, res) => {
  try {
    const lines = Math.min(parseInt(req.query.lines) || 30, 200);
    const sessions = await tmuxCaptureAll(lines);
    res.json({ sessions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/polecats', async (req, res) => {
  try {
    const result = await runCommand('gt', ['polecat', 'list', '--all', '--json']);
    if (result.ok && result.stdout) {
      res.json(JSON.parse(result.stdout));
    } else {
      res.json([]);
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/rigs', (req, res) => {
  try { res.json(getRigs()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/config', (req, res) => {
  res.json(config);
});

app.get('/api/git', async (req, res) => {
  try { res.json(await gitInfo()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cmd', async (req, res) => {
  const { cmd, args } = req.body;
  if (!cmd) return res.status(400).json({ error: 'cmd is required' });
  try {
    const result = await runCommand(cmd, args || []);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/mail/send', async (req, res) => {
  const { to, subject, body } = req.body;
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject, and body are required' });
  }
  try {
    const result = await runCommand('gt', ['mail', 'send', to, '-s', subject, '-m', body]);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Polling configuration ---

app.get('/api/polling', (req, res) => {
  res.json(getIntervals());
});

app.post('/api/polling', (req, res) => {
  const { terminalMs, dbMs, gitMs } = req.body;
  const changed = setIntervals({ terminalMs, dbMs, gitMs });
  res.json({ ok: true, changed, intervals: getIntervals() });
});

// --- WebSocket ---

wss.on('connection', (ws) => {
  addClient(ws);
});

// --- Start ---

const PORT = 3737;
init().then(() => {
  server.listen(PORT, () => {
    console.log(`Gas Town dashboard backend on http://localhost:${PORT}`);
    startAll();
  });
}).catch(e => {
  console.error('Init failed:', e.message);
  process.exit(1);
});
