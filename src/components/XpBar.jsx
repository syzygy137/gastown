import React from 'react';

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000];

function getLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
}

function getLevelProgress(xp) {
  const level = getLevel(xp);
  if (level >= LEVEL_THRESHOLDS.length - 1) return 1;
  const current = LEVEL_THRESHOLDS[level];
  const next = LEVEL_THRESHOLDS[level + 1];
  return (xp - current) / (next - current);
}

const LEVEL_TITLES = [
  'Recruit', 'Apprentice', 'Journeyman', 'Operator',
  'Specialist', 'Expert', 'Veteran', 'Elite',
  'Master', 'Grandmaster', 'Legendary',
];

const LEVEL_COLORS = [
  'var(--text-dim)', 'var(--text-dim)', 'var(--green)', 'var(--green)',
  'var(--cyan)', 'var(--cyan)', 'var(--yellow)', 'var(--yellow)',
  'var(--orange)', 'var(--accent)', 'var(--purple)',
];

export function calculateAgentXp(agent, issues) {
  let xp = 50;

  const agentId = agent.id;
  const agentTitle = (agent.title || '').split(' - ')[0].split(' (')[0].toLowerCase();

  for (const issue of issues) {
    const assignee = (issue.assignee || '').toLowerCase();
    const isAssigned = assignee === agentId || assignee === agentTitle;

    if (isAssigned) {
      if (issue.status === 'closed' || issue.status === 'done') {
        xp += 200;
      } else if (issue.status === 'in_progress' || issue.status === 'in-progress') {
        xp += 50;
      } else {
        xp += 25;
      }
    }
  }

  const state = (agent.agent_state || '').toLowerCase();
  if (state === 'active' || state === 'in-progress' || state === 'in_progress') {
    xp += 100;
  }

  if (agent.hook_bead) {
    xp += 75;
  }

  const role = (agent.role_type || '').toLowerCase();
  if (role === 'mayor') xp += 500;
  else if (role === 'deacon') xp += 400;
  else if (role === 'witness') xp += 200;
  else if (role === 'refinery') xp += 200;
  else if (role === 'polecat') xp += 100;

  return xp;
}

export default function XpBar({ xp, compact = false }) {
  const level = getLevel(xp);
  const progress = getLevelProgress(xp);
  const title = LEVEL_TITLES[level] || 'Unknown';
  const color = LEVEL_COLORS[level] || 'var(--text-dim)';
  const pct = Math.round(progress * 100);

  if (compact) {
    return (
      <div className="xp-bar xp-bar--compact">
        <div className="xp-bar__level-badge" style={{ color, borderColor: color }}>
          {level}
        </div>
        <div className="xp-bar__track">
          <div
            className="xp-bar__fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="xp-bar">
      <div className="xp-bar__header">
        <div className="xp-bar__level-badge" style={{ color, borderColor: color }}>
          Lv.{level}
        </div>
        <span className="xp-bar__title" style={{ color }}>{title}</span>
        <span className="xp-bar__xp">{xp} XP</span>
      </div>
      <div className="xp-bar__track">
        <div
          className="xp-bar__fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
