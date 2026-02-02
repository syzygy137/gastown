import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { getIssues, getAgents, getMail, getEvents, getLabels, getIssueCounts, getConfig as getDbConfig, getRigs } from './db.js';
import { tmuxListSessions, tmuxCapture, gitInfo, daemonStatus, loadFormulas, loadConfig, runCommand } from './shell.js';
import { addClient, startAll } from './poller.js';

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
