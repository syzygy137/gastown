import Database from 'better-sqlite3';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const GT_ROOT = join(process.env.HOME, 'gt');
const RIGS_JSON = join(GT_ROOT, 'mayor', 'rigs.json');

let dbs = null; // Array of { rig: string, db: Database }

function loadRigNames() {
  try {
    const raw = readFileSync(RIGS_JSON, 'utf-8');
    const data = JSON.parse(raw);
    return data.rigs ? Object.keys(data.rigs) : [];
  } catch {
    return [];
  }
}

function openDb(path, rigName) {
  if (!existsSync(path)) {
    console.warn(`[db] skipping ${rigName}: ${path} not found`);
    return null;
  }
  try {
    const d = new Database(path, { readonly: true, fileMustExist: true });
    d.pragma('journal_mode = WAL');
    return d;
  } catch (e) {
    console.warn(`[db] skipping ${rigName}: ${e.message}`);
    return null;
  }
}

function initDbs() {
  if (dbs) return dbs;
  dbs = [];

  // Town-level database
  const townDb = openDb(join(GT_ROOT, '.beads', 'beads.db'), 'town');
  if (townDb) dbs.push({ rig: 'town', db: townDb });

  // Rig databases
  for (const rig of loadRigNames()) {
    const rigDb = openDb(join(GT_ROOT, rig, '.beads', 'beads.db'), rig);
    if (rigDb) dbs.push({ rig, db: rigDb });
  }

  if (dbs.length === 0) {
    throw new Error('No databases found');
  }
  return dbs;
}

function queryAll(fn) {
  const all = initDbs();
  const results = [];
  for (const { rig, db } of all) {
    try {
      const rows = fn(db);
      for (const row of rows) {
        row.rig = rig;
      }
      results.push(...rows);
    } catch (e) {
      console.warn(`[db] query failed for ${rig}: ${e.message}`);
    }
  }
  return results;
}

export function getDb() {
  const all = initDbs();
  return all[0].db;
}

export function getRigs() {
  try {
    const raw = readFileSync(RIGS_JSON, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { version: 1, rigs: {} };
  }
}

export function getIssues({ type, status, limit } = {}) {
  let sql = 'SELECT * FROM issues WHERE 1=1';
  const params = [];
  if (type) { sql += ' AND issue_type = ?'; params.push(type); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC';
  const results = queryAll(db => db.prepare(sql).all(...params));
  results.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  if (limit) return results.slice(0, limit);
  return results;
}

function parseDescriptionMeta(desc) {
  if (!desc) return {};
  const meta = {};
  for (const line of desc.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m && m[2].trim() !== 'null') meta[m[1]] = m[2].trim();
  }
  return meta;
}

export function getAgents() {
  const results = queryAll(db =>
    db.prepare(
      "SELECT * FROM issues WHERE issue_type = 'agent' OR (role_type IS NOT NULL AND role_type != '') ORDER BY created_at ASC"
    ).all()
  );
  // Parse description metadata into top-level fields
  for (const agent of results) {
    const meta = parseDescriptionMeta(agent.description);
    if (!agent.role_type) agent.role_type = meta.role_type || '';
    if (!agent.agent_state) agent.agent_state = meta.agent_state || 'idle';
    if (!agent.hook_bead) agent.hook_bead = meta.hook_bead || '';
  }
  results.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
  return results;
}

export function getMail() {
  const results = queryAll(db =>
    db.prepare(
      "SELECT * FROM issues WHERE issue_type = 'message' ORDER BY created_at DESC LIMIT 200"
    ).all()
  );
  results.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  return results.slice(0, 200);
}

export function getEvents({ limit = 100 } = {}) {
  const results = queryAll(db =>
    db.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT ?').all(limit)
  );
  results.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  return results.slice(0, limit);
}

export function getLabels(issueId) {
  if (issueId) {
    return queryAll(db =>
      db.prepare('SELECT * FROM labels WHERE issue_id = ?').all(issueId)
    );
  }
  return queryAll(db => db.prepare('SELECT * FROM labels').all());
}

export function getComments(issueId) {
  if (issueId) {
    return queryAll(db =>
      db.prepare('SELECT * FROM comments WHERE issue_id = ?').all(issueId)
    );
  }
  const results = queryAll(db =>
    db.prepare('SELECT * FROM comments ORDER BY rowid DESC LIMIT 100').all()
  );
  return results.slice(0, 100);
}

export function getDependencies() {
  return queryAll(db => db.prepare('SELECT * FROM dependencies').all());
}

export function getConfig() {
  return queryAll(db => db.prepare('SELECT * FROM config').all());
}

export function getIssueCounts() {
  const allCounts = queryAll(db =>
    db.prepare("SELECT status, COUNT(*) as count FROM issues WHERE issue_type NOT IN ('agent', 'message') GROUP BY status").all()
  );
  const merged = {};
  for (const row of allCounts) {
    if (!merged[row.status]) {
      merged[row.status] = { status: row.status, count: 0 };
    }
    merged[row.status].count += row.count;
  }
  return Object.values(merged);
}

export function getSnapshot() {
  return {
    issues: getIssues(),
    agents: getAgents(),
    mail: getMail(),
    events: getEvents(),
    labels: getLabels(),
    dependencies: getDependencies(),
    counts: getIssueCounts(),
  };
}
