import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { join } from 'path';

const GT_ROOT = join(process.env.HOME, 'gt');
const DB_PATH = join(GT_ROOT, '.beads', 'beads.db');

let db = null;

export function getDb() {
  if (db) return db;
  if (!existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }
  db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  db.pragma('journal_mode = WAL');
  return db;
}

export function getIssues({ type, status, limit } = {}) {
  const d = getDb();
  let sql = 'SELECT * FROM issues WHERE 1=1';
  const params = [];
  if (type) { sql += ' AND issue_type = ?'; params.push(type); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(limit); }
  return d.prepare(sql).all(...params);
}

export function getAgents() {
  const d = getDb();
  return d.prepare(
    "SELECT * FROM issues WHERE issue_type = 'agent' OR (role_type IS NOT NULL AND role_type != '') ORDER BY created_at ASC"
  ).all();
}

export function getMail() {
  const d = getDb();
  return d.prepare(
    "SELECT * FROM issues WHERE issue_type = 'message' ORDER BY created_at DESC LIMIT 200"
  ).all();
}

export function getEvents({ limit = 100 } = {}) {
  const d = getDb();
  return d.prepare(
    'SELECT * FROM events ORDER BY rowid DESC LIMIT ?'
  ).all(limit);
}

export function getLabels(issueId) {
  const d = getDb();
  if (issueId) {
    return d.prepare('SELECT * FROM labels WHERE issue_id = ?').all(issueId);
  }
  return d.prepare('SELECT * FROM labels').all();
}

export function getComments(issueId) {
  const d = getDb();
  if (issueId) {
    return d.prepare('SELECT * FROM comments WHERE issue_id = ?').all(issueId);
  }
  return d.prepare('SELECT * FROM comments ORDER BY rowid DESC LIMIT 100').all();
}

export function getDependencies() {
  const d = getDb();
  return d.prepare('SELECT * FROM dependencies').all();
}

export function getConfig() {
  const d = getDb();
  return d.prepare('SELECT * FROM config').all();
}

export function getIssueCounts() {
  const d = getDb();
  return d.prepare(
    "SELECT status, COUNT(*) as count FROM issues GROUP BY status"
  ).all();
}

export function getSnapshot() {
  return {
    issues: getIssues(),
    agents: getAgents(),
    mail: getMail(),
    events: getEvents(),
    labels: getLabels(),
    counts: getIssueCounts(),
  };
}
