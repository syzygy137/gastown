import { execFile } from 'child_process';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { parse as parseTOML } from 'smol-toml';

const GT_ROOT = join(process.env.HOME, 'gt');
const FORMULAS_DIR = join(GT_ROOT, '.beads', 'formulas');
const MAYOR_DIR = join(GT_ROOT, 'mayor');
const SETTINGS_DIR = join(GT_ROOT, 'settings');

function exec(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, {
      timeout: opts.timeout || 10000,
      cwd: opts.cwd || GT_ROOT,
      env: { ...process.env, ...opts.env },
    }, (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, error: err.message, stderr, stdout });
      } else {
        resolve({ ok: true, stdout: stdout.trim(), stderr: stderr.trim() });
      }
    });
  });
}

export async function tmuxListSessions() {
  const result = await exec('tmux', ['list-sessions', '-F', '#{session_name}:#{session_windows}:#{session_attached}']);
  if (!result.ok) return [];
  return result.stdout.split('\n').filter(Boolean).map(line => {
    const [name, windows, attached] = line.split(':');
    return { name, windows: parseInt(windows), attached: attached === '1' };
  });
}

export async function tmuxCapture(session, lines = 50) {
  const result = await exec('tmux', ['capture-pane', '-t', session, '-p', '-S', `-${lines}`]);
  return result.ok ? result.stdout : `(no output for ${session})`;
}

export async function tmuxCaptureAll(lines = 5) {
  const sessions = await tmuxListSessions();
  const results = {};
  await Promise.all(sessions.map(async (s) => {
    const output = await tmuxCapture(s.name, lines);
    results[s.name] = { output, lines: output.split('\n').filter(Boolean) };
  }));
  return results;
}

export async function gitInfo() {
  const [branches, worktrees] = await Promise.all([
    exec('git', ['branch', '-a', '--format=%(refname:short) %(upstream:short) %(HEAD)'], { cwd: GT_ROOT }),
    exec('git', ['worktree', 'list', '--porcelain'], { cwd: GT_ROOT }),
  ]);
  return {
    branches: branches.ok ? branches.stdout.split('\n').filter(Boolean).map(l => {
      const parts = l.trim().split(/\s+/);
      return { name: parts[0], upstream: parts[1] || null, current: parts[2] === '*' };
    }) : [],
    worktrees: worktrees.ok ? parseWorktrees(worktrees.stdout) : [],
  };
}

function parseWorktrees(raw) {
  const trees = [];
  let current = null;
  for (const line of raw.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) trees.push(current);
      current = { path: line.slice(9) };
    } else if (line.startsWith('HEAD ') && current) {
      current.head = line.slice(5);
    } else if (line.startsWith('branch ') && current) {
      current.branch = line.slice(7);
    } else if (line === 'bare' && current) {
      current.bare = true;
    }
  }
  if (current) trees.push(current);
  return trees;
}

export async function daemonStatus() {
  const result = await exec('gt', ['daemon', 'status'], { timeout: 5000 });
  return { running: result.ok && !result.stdout.includes('not running'), output: result.stdout || result.stderr || result.error };
}

export async function runCommand(cmd, args = []) {
  const allowed = ['gt', 'bd'];
  if (!allowed.includes(cmd)) {
    return { ok: false, error: `Command not allowed: ${cmd}` };
  }
  return exec(cmd, args, { timeout: 30000 });
}

export async function loadFormulas() {
  try {
    const files = await readdir(FORMULAS_DIR);
    const tomlFiles = files.filter(f => f.endsWith('.formula.toml'));
    const formulas = {};
    for (const file of tomlFiles) {
      try {
        const raw = await readFile(join(FORMULAS_DIR, file), 'utf-8');
        const parsed = parseTOML(raw);
        const name = file.replace('.formula.toml', '');
        formulas[name] = { name, file, ...parsed };
      } catch (e) {
        const name = file.replace('.formula.toml', '');
        formulas[name] = { name, file, error: e.message };
      }
    }
    return formulas;
  } catch {
    return {};
  }
}

export async function loadConfig() {
  const files = ['town.json', 'daemon.json', 'overseer.json', 'rigs.json'];
  const config = {};
  for (const file of files) {
    try {
      const raw = await readFile(join(MAYOR_DIR, file), 'utf-8');
      config[file.replace('.json', '')] = JSON.parse(raw);
    } catch { /* skip missing */ }
  }
  try {
    const raw = await readFile(join(SETTINGS_DIR, 'escalation.json'), 'utf-8');
    config.escalation = JSON.parse(raw);
  } catch { /* skip */ }
  try {
    const raw = await readFile(join(GT_ROOT, 'daemon', 'activity.json'), 'utf-8');
    config.daemon_activity = JSON.parse(raw);
  } catch { /* skip */ }
  return config;
}
