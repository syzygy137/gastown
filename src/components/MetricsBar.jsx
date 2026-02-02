import React, { useMemo, useState, useEffect, useRef } from 'react';

function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 40, h = 14;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - 1 - ((v / max) * (h - 2));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="sparkline" width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

const METRIC_KEYS = ['totalAgents', 'activePolecats', 'pending', 'inProgress', 'mergeQueue', 'mailCount'];

function parseAgentMeta(desc) {
  if (!desc) return {};
  const meta = {};
  for (const line of desc.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  return meta;
}

const SESSION_MAP = {
  'hq-mayor': 'hq-mayor',
  'hq-deacon': 'hq-deacon',
  'sl-slop-witness': 'gt-slop-witness',
  'sl-slop-refinery': 'gt-slop-refinery',
  'gs-gastown-witness': 'gt-gastown-witness',
  'gs-gastown-refinery': 'gt-gastown-refinery',
};

function findSession(agentId, sessions) {
  const name = SESSION_MAP[agentId] || agentId;
  return sessions.find(s => s.name === name) || null;
}

function deriveState(agent, sessions) {
  const session = findSession(agent.id, sessions);
  if (!session) return 'offline';
  const meta = parseAgentMeta(agent.description);
  const hookBead = agent.hook_bead || meta.hook_bead;
  if (hookBead && hookBead !== 'null' && hookBead !== '') return 'working';
  return 'idle';
}

export default function MetricsBar({ agents, issues, counts, mail, daemon, sessions = [] }) {
  const metrics = useMemo(() => {
    const totalAgents = agents.length;
    const activePolecats = agents.filter(a => {
      const role = (a.role_type || '').toLowerCase();
      if (role !== 'polecat') return false;
      const state = deriveState(a, sessions);
      return state === 'working' || state === 'idle';
    }).length;

    const countMap = {};
    for (const c of counts) countMap[c.status] = c.count;
    const pending = countMap['open'] || 0;
    const inProgress = (countMap['in_progress'] || 0) + (countMap['in-progress'] || 0) + (countMap['hooked'] || 0);

    const mergeQueue = issues.filter(
      i => i.issue_type === 'merge-request' && (i.status === 'open' || i.status === 'in_progress')
    ).length;

    const mailCount = mail.length;

    let health = 'neutral';
    if (totalAgents > 0) {
      const aliveCount = agents.filter(a => a.status === 'open').length;
      const ratio = aliveCount / totalAgents;
      health = ratio > 0.5 ? 'good' : ratio > 0 ? 'warn' : 'idle';
    }

    return { totalAgents, activePolecats, pending, inProgress, mergeQueue, mailCount, health };
  }, [agents, issues, counts, mail, sessions]);

  const [history, setHistory] = useState(() => {
    const h = {};
    for (const k of METRIC_KEYS) h[k] = [];
    return h;
  });
  const prevRef = useRef(null);
  const [flashes, setFlashes] = useState({});

  useEffect(() => {
    setHistory(prev => {
      const next = {};
      for (const k of METRIC_KEYS) {
        next[k] = [...prev[k], metrics[k]].slice(-20);
      }
      return next;
    });

    if (prevRef.current) {
      const f = {};
      for (const k of METRIC_KEYS) {
        if (metrics[k] > prevRef.current[k]) f[k] = 'up';
        else if (metrics[k] < prevRef.current[k]) f[k] = 'down';
      }
      if (Object.keys(f).length > 0) setFlashes(f);
    }
    prevRef.current = { ...metrics };
  }, [metrics]);

  useEffect(() => {
    if (Object.keys(flashes).length > 0) {
      const t = setTimeout(() => setFlashes({}), 600);
      return () => clearTimeout(t);
    }
  }, [flashes]);

  function flashCls(key) {
    return flashes[key] ? ` metric-flash-${flashes[key]}` : '';
  }

  return (
    <div className="metrics-bar">
      <div className="metric-card">
        <div className={`metric-number${flashCls('totalAgents')}`} style={{ color: 'var(--cyan)' }}>
          {metrics.totalAgents}
          <span className={`health-dot health-${metrics.health}`} />
        </div>
        <div className="metric-label">Agents</div>
        <Sparkline data={history.totalAgents} color="var(--cyan)" />
      </div>

      <div className="metric-card">
        <div className={`metric-number${flashCls('activePolecats')}`} style={{ color: 'var(--green)' }}>
          {metrics.activePolecats}
        </div>
        <div className="metric-label">Active Polecats</div>
        <Sparkline data={history.activePolecats} color="var(--green)" />
      </div>

      <div className="metric-card">
        <div className={`metric-number${flashCls('pending')}`} style={{ color: 'var(--yellow)' }}>
          {metrics.pending}
        </div>
        <div className="metric-label">Pending</div>
        <Sparkline data={history.pending} color="var(--yellow)" />
      </div>

      <div className="metric-card">
        <div className={`metric-number${flashCls('inProgress')}`} style={{ color: 'var(--accent)' }}>
          {metrics.inProgress}
        </div>
        <div className="metric-label">In Progress</div>
        <Sparkline data={history.inProgress} color="var(--accent)" />
      </div>

      <div className="metric-card">
        <div className={`metric-number${flashCls('mergeQueue')}`} style={{ color: 'var(--purple)' }}>
          {metrics.mergeQueue}
        </div>
        <div className="metric-label">Merge Queue</div>
        <Sparkline data={history.mergeQueue} color="var(--purple)" />
      </div>

      <div className="metric-card">
        <div className={`metric-number${flashCls('mailCount')}`} style={{ color: 'var(--orange)' }}>
          {metrics.mailCount}
        </div>
        <div className="metric-label">Mail</div>
        <Sparkline data={history.mailCount} color="var(--orange)" />
      </div>

      <div className="metric-card">
        <div className={`daemon-light ${daemon.running ? 'running' : 'stopped'}`} />
        <div className="metric-label">Daemon</div>
      </div>
    </div>
  );
}
